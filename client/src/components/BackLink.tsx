import { Link } from "react-router";

type Props = {
  to: string;
  label: string;
};

export function BackLink({ to, label }: Props) {
  return (
    <Link to={to} className="text-sm text-muted-foreground hover:text-foreground">
      ← {label}
    </Link>
  );
}
