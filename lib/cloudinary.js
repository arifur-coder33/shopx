import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: "shopzarif",
  api_key: "387829292346962",
  api_secret: "BGkM1QJi2I2f1hin3K0lmVrZCOw",
  secure: true,
  timeout: 60000, // 60s
});

export default cloudinary;
