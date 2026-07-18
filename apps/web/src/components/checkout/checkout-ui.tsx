'use client';

// Checkout'ning sof prezentatsion elementlari — state'siz, props-only.
// checkout-flow.tsx'dan ajratilgan (xatti-harakat o'zgarmagan).

export function Step({
  index,
  label,
  active,
  done,
}: {
  index?: string;
  label: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={`grid h-[26px] w-[26px] place-items-center rounded-full text-xs font-extrabold ${
          done
            ? 'bg-brand-ink text-brand-gold'
            : active
              ? 'bg-primary text-white'
              : 'border-[1.5px] border-[#d5d5d9] text-[#9a9aa2]'
        }`}
      >
        {done ? '✓' : index}
      </span>
      <span
        className={`hidden text-[13px] font-bold sm:inline ${
          done ? 'text-brand-ink' : active ? 'text-primary' : 'font-semibold text-[#9a9aa2]'
        }`}
      >
        {label}
      </span>
    </li>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-brand-ink mb-1.5 block text-xs font-semibold">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-border text-brand-ink focus:border-primary focus:ring-primary/15 h-11 w-full rounded-xl border bg-white px-3.5 text-sm outline-none transition placeholder:text-[#9a9aa2] focus:ring-2"
      />
    </div>
  );
}

export function DeliveryRow({
  selected,
  onSelect,
  title,
  sub,
  price,
  priceTone,
  chip,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  sub: string;
  price: string;
  priceTone?: 'success';
  chip?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-4 rounded-[14px] border-2 p-4 text-left transition ${
        selected ? 'border-primary' : 'border-border hover:border-foreground/20'
      }`}
    >
      <span
        className={`h-5 w-5 shrink-0 rounded-full ${
          selected ? 'border-primary border-[6px]' : 'border-[1.5px] border-[#d5d5d9]'
        }`}
      />
      <div className="flex-1">
        <div className="text-brand-ink flex items-center gap-2 text-sm font-bold">
          {title}
          {chip && (
            <span className="bg-brand-gold text-brand-crimson-deep rounded-full px-2 py-[3px] text-[10px] font-extrabold">
              {chip}
            </span>
          )}
        </div>
        <div className="text-muted-foreground mt-0.5 text-[12.5px]">{sub}</div>
      </div>
      <span
        className={`whitespace-nowrap text-sm font-extrabold ${
          priceTone === 'success' ? 'text-success' : 'text-brand-ink'
        }`}
      >
        {price}
      </span>
    </button>
  );
}
