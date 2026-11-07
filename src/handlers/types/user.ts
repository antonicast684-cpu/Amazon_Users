export interface User {
    userid: string;
    email: string;
    password: string;
    name: string;
    role: "buyer" | "seller";
    createdAt: string;
    updatedAt: string;
}