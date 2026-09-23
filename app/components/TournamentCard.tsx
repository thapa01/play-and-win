import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Gift,
  Users,
} from "lucide-react";

type TournamentCardProps = {
  game: string;
  title: string;
  type: string;
  date: string;
  players: string;
  prize: string;
  image: string;
  href: string;
};

export default function TournamentCard({
  game,
  title,
  type,
  date,
  players,
  prize,
  image,
  href,
}: TournamentCardProps) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">

      {/* Image */}
      <div
        className="relative h-44 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(to top, rgba(0,0,0,.82), rgba(0,0,0,.05)), url('${image}')`,
        }}
      >

        {/* Game */}
        <span className="absolute left-4 top-4 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-black text-slate-950">
          {game}
        </span>

        {/* Type */}
        <span className="absolute right-4 top-4 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-900">
          {type}
        </span>

        {/* Title */}
        <h3 className="absolute bottom-4 left-4 text-xl font-black text-white">
          {title}
        </h3>

      </div>

      {/* Details */}
      <div className="p-5">

        <div className="space-y-3 text-sm text-slate-600">

          <div className="flex items-center gap-2">
            <CalendarDays size={17} className="text-slate-400" />
            <span>{date}</span>
          </div>

          <div className="flex items-center gap-2">
            <Users size={17} className="text-slate-400" />
            <span>{players} Players</span>
          </div>

          <div className="flex items-center gap-2">
            <Gift size={17} className="text-slate-400" />
            <span>
              Prize Pool:{" "}
              <strong className="text-slate-900">
                {prize}
              </strong>
            </span>
          </div>

        </div>

        {/* Join Button */}
        <Link
  href={href}
  className="group/button mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3 text-sm font-bold text-slate-950 transition hover:bg-yellow-500"
>
  Join Now
  <ArrowRight
    size={17}
    className="transition group-hover/button:translate-x-1"
  />
</Link>

      </div>
    </div>
  );
}