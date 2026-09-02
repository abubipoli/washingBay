import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await prisma.businessSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  return (
    <div className="min-h-screen flex bg-background">
      {/* Branded photo panel — desktop only */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <Image
          src="/brand/bay-photo.png"
          alt="First Class Washing Bay — car wash bay in operation"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/50" />
        <div className="relative z-10 h-full flex flex-col justify-end p-12 text-white">
          <Image
            src="/brand/logo.png"
            alt={settings.businessName}
            width={110}
            height={110}
            className="mb-6 drop-shadow-lg"
          />
          <h2 className="text-display-lg font-display-lg mb-3">Clean. Shine. Ride in style.</h2>
          <p className="text-body-lg text-white/85 max-w-md">
            Transparent revenue splits, daily commission payouts, and full business reporting — everything for
            running the bay, in one place.
          </p>
        </div>
      </div>

      {/* Login form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding">
          <div className="flex flex-col items-center text-center mb-stack-lg">
            <Image
              src="/brand/logo.png"
              alt={settings.businessName}
              width={84}
              height={84}
              className="mb-3"
              priority
            />
            <h1 className="text-headline-md font-headline-md font-bold text-primary">{settings.businessName}</h1>
            <p className="text-label-caps font-label-caps text-on-surface-variant">Management System</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
