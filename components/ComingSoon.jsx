import Icon from "./Icon";
import { useI18n } from "@/lib/i18n";

export default function ComingSoon({ title, description, icon = "clock" }) {
  const { t } = useI18n();
  return (
    <div className="card flex flex-col items-center justify-center text-center py-20 px-6">
      <span className="w-14 h-14 rounded-2xl bg-gold-50 text-gold-600 flex items-center justify-center mb-4">
        <Icon name={icon} size={26} />
      </span>
      <h2 className="serif text-xl font-bold text-ink-800 mb-2">{title}</h2>
      <p className="text-sm text-muted max-w-md">
        {description || t("comingSoon.defaultDescription")}
      </p>
    </div>
  );
}
