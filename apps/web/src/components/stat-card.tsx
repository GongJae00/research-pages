import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent?: "blue" | "green" | "amber" | "slate";
}

export function StatCard({ icon: Icon, label, value, accent = "blue" }: StatCardProps) {
  return (
    <div className={`stat-card stat-card-${accent}`}>
      <div className="stat-card-icon">
        <Icon size={20} />
      </div>
      <div className="stat-card-body">
        <span className="stat-card-value">{value}</span>
        <span className="stat-card-label">{label}</span>
      </div>
    </div>
  );
}
