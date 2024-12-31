"use server";

import { signIn, signOut } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
// export const loginWithCreds = async (formData) => {
//   try {
//     const rawFormData = {
//       email: formData.get("email"),
//       password: formData.get("password"),
//       redirect: false,
//     };

//     // Call the NextAuth signIn function
//     await signIn("credentials", rawFormData);
//   } catch (error) {
//     if (error instanceof AuthError) {
//       switch (error.type) {
//         case "CredentialsSignin":
//           return {
//             message: "Invalid credentials",
//           };
//         default:
//           return {
//             message: "Something went wrong.",
//           };
//       }
//     }
//     throw error;
//   }
// };

export async function loginWithCreds(formData) {
  try {
    const rawFormData = {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    };
    await signIn("credentials", rawFormData);
  } catch (error) {
    if (error instanceof AuthError) {
      console.log(`Error Type: ${error.type}`);
      switch (error.type) {
        case "CredentialsSignin":
          return {
            message: "Invalid credentials",
          };
        default:
          return {
            message: "Something went wrong.",
          };
      }
    }
    throw error;
  }
}

export async function userregistration(request) {
  try {
    const formData = await request.formData();
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");
    const phone = formData.get("phone");

    if (!email || !password) {
      return new Response(
        JSON.stringify({ message: "Email and password are required" }),
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return new Response(JSON.stringify({ message: "User already exists" }), {
        status: 400,
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
      },
    });

    return new Response(
      JSON.stringify({ message: "User registered successfully", user }),
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ message: "Something went wrong" }), {
      status: 500,
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function registrationAction(formData) {
  try {
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");
    const phone = formData.get("phone");

    if (!email || !password) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("আপনি ইতিমধ্যে নিবন্ধন করেছেন।");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
      },
    });

    return { success: true, user }; // Return success with user data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function logout(params) {
  await signOut();
}


export async function GetUserList() {
  try {
    const data = await prisma.user.findMany();

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to delete ",
    }
  }
}

export async function deleteUserById(id) {
  try {
    // Delete the order by its ID
    const deletedOrder = await prisma.user.delete({
      where: {
        id: id,
      },
    });
    revalidatePath("/admin/users");

    return {
      success: true,
      data: " deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting the product:", error);
    return {
      success: false,
      message: error.message || "Failed to delete ",
    };
  } finally {
    await prisma.$disconnect();
  }
}