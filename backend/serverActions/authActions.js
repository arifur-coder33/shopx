"use server";

import { signIn, signOut } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { getListCount } from "../utils/getListCount";
import { getListData } from "../utils/getListData";
export async function GetUserList(params) {
  return getListData({
    prisma,
    model: "user",
    params,
    searchableFields: [
      { field: "name", type: "string", mode: "insensitive" },
      { field: "email", type: "string", mode: "insensitive" },
      { field: "phone", type: "string", mode: "insensitive" },
    ],
    relationSearch: {
      role: {
        relation: "role",
        field: "name",
        type: "string",
        relationType: "single",
        exactMatch: true,
      },
    },
    dateField: "createdAt",
  });
}

export async function getUserCount(params) {
  return getListCount({
    prisma,
    model: "user",
    params,
    searchableFields: [
      { field: "name", type: "string", mode: "insensitive" },
      { field: "email", type: "string", mode: "insensitive" },
      { field: "phone", type: "string", mode: "insensitive" },
    ],
    relationSearch: {
      role: {
        relation: "role",
        field: "name",
        relationType: "single",
        type: "string",
        exactMatch: true,
      },
    },
    dateField: "createdAt",
  });
}
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
        { status: 400 },
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
      { status: 201 },
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

const DEFAULT_ROLE = "USER";

export async function registrationAction(formData) {
  try {
    const name = formData.get("name")?.trim();
    const email = formData.get("email")?.trim().toLowerCase();
    const password = formData.get("password");
    const phone = formData.get("phone")?.trim();

    // 🔹 Basic validation
    if (!email || !password) {
      throw new Error("সব ফিল্ডে তথ্য দিন।");
    }

    // 🔹 Email already exists check
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("আপনি ইতিমধ্যে নিবন্ধন করেছেন।");
    }

    // 🔹 Get or create default role safely
    const defaultRole = await prisma.role.upsert({
      where: { name: DEFAULT_ROLE },
      update: {},
      create: { name: DEFAULT_ROLE },
    });

    // 🔹 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 Create user with default role
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        roleId: defaultRole.id,
      },
    });

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function logout(params) {
  await signOut();
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
