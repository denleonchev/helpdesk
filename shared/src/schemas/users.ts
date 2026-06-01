import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const editUserSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    email: z.email("Invalid email"),
    oldPassword: z.string().optional(),
    newPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasOld = !!data.oldPassword;
    const hasNew = !!data.newPassword;
    if (hasOld && !hasNew) {
      ctx.addIssue({ code: "custom", path: ["newPassword"], message: "New password is required" });
    }
    if (!hasOld && hasNew) {
      ctx.addIssue({ code: "custom", path: ["oldPassword"], message: "Old password is required" });
    }
    if (hasNew && data.newPassword!.length < 8) {
      ctx.addIssue({ code: "custom", path: ["newPassword"], message: "New password must be at least 8 characters" });
    }
  });

export type EditUserInput = z.infer<typeof editUserSchema>;
