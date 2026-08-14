export const STAGE =
  process.env.NODE_ENV === "development"
    ? "dev"
    : process.env.NODE_ENV === "production"
      ? ""
      : "preview";
