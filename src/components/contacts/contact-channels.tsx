import { Mail, MessageCircle, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

type Props = {
  email: string | null;
  phone: string | null;
};

function normalisePhoneForWhatsApp(raw: string): string | null {
  // Strip everything except digits. WhatsApp wa.me wants the international
  // number with NO leading + and NO spaces. If it looks too short to be
  // valid (<7 digits) return null so we don't render a broken link.
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits;
}

/**
 * Server component — renders quick-action buttons for the contact's
 * communication channels (email, phone call, WhatsApp). Hides silently
 * when no channels are available.
 */
export async function ContactChannels({ email, phone }: Props) {
  const t = await getTranslations("crm.channels");

  const waNumber = phone ? normalisePhoneForWhatsApp(phone) : null;
  const hasAny = Boolean(email) || Boolean(phone) || Boolean(waNumber);
  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {email && (
        <Button asChild size="sm" variant="outline">
          <a href={`mailto:${email}`}>
            <Mail className="mr-2 h-3.5 w-3.5" />
            {t("email")}
          </a>
        </Button>
      )}
      {phone && (
        <Button asChild size="sm" variant="outline">
          <a href={`tel:${phone}`}>
            <Phone className="mr-2 h-3.5 w-3.5" />
            {t("call")}
          </a>
        </Button>
      )}
      {waNumber && (
        <Button asChild size="sm" variant="outline">
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            <MessageCircle className="mr-2 h-3.5 w-3.5" />
            {t("whatsapp")}
          </a>
        </Button>
      )}
    </div>
  );
}
