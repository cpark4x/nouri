import KitchenCalibration from "@/components/settings/kitchen-calibration";
import InvitePartner from "@/components/settings/invite-partner";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Settings
      </h1>

      {/* Kitchen calibration */}
      <KitchenCalibration />

      {/* Invite partner */}
      <InvitePartner />

      {/* Account */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Account</h2>
        <SignOutButton />
      </section>
    </div>
  );
}
