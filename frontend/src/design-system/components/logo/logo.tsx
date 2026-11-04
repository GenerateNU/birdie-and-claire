import logo from "../../assets/logo.png";

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return <img src={logo} alt="Birdie & Claire" className={className} />;
}
