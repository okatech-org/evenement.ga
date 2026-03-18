import VerifyPage from "./verify-client";

export const metadata = {
  title: "Vérification d'invitation | EventFlow",
  description: "Vérifiez l'authenticité et la validité d'une invitation",
};

export default function VerifyPageWrapper({
  params,
}: {
  params: { token: string };
}) {
  return <VerifyPage token={params.token} />;
}
