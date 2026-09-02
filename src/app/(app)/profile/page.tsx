import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-stack-lg">
      <div>
        <h2 className="text-display-lg font-display-lg text-on-surface">My Profile</h2>
        <p className="text-on-surface-variant mt-1">Manage your account and password.</p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding flex flex-col gap-1">
        <h3 className="text-headline-md font-headline-md mb-2">Account</h3>
        <p className="text-body-md">
          <span className="text-on-surface-variant">Name: </span>
          {session?.user.name}
        </p>
        <p className="text-body-md">
          <span className="text-on-surface-variant">Email: </span>
          {session?.user.email}
        </p>
        <p className="text-body-md">
          <span className="text-on-surface-variant">Role: </span>
          {session?.user.role === "OWNER" ? "Owner" : "Manager"}
        </p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding">
        <h3 className="text-headline-md font-headline-md mb-4">Change Password</h3>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
