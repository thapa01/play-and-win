import Link from "next/link";
import { ArrowRight } from "lucide-react";

type GameCardProps = {
  title: string;
  description: string;
  image: string;
  href: string;
};

export default function GameCard({
  title,
  description,
  image,
  href,
}: GameCardProps) {
  return (
    <Link
      href={href}
      className="group relative block h-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <img
        src={image}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-6">
        <div>
          <h3 className="text-2xl font-black text-white">
            {title}
          </h3>

          <p className="mt-1 text-sm text-white/80">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 transition group-hover:bg-yellow-400">
          <ArrowRight size={20} />
        </div>
      </div>
    </Link>
  );
}