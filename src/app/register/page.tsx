import { RegistrationForm } from "@/components/business/RegistrationForm";
import { registrationEnabled } from "@/modules/business/registration";
export const dynamic = "force-dynamic";
export default function Page() {
  return <RegistrationForm enabled={registrationEnabled()} />;
}
