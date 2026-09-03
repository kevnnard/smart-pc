import { type FormEvent, useState } from "react";

interface Props {
  formspreeId?: string;
}

export default function ContactForm({ formspreeId }: Props) {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const form = e.currentTarget;
    const formData = new FormData(form as HTMLFormElement);

    if (!formspreeId) {
      const subject = encodeURIComponent(
        (formData.get("subject") as string) || "Consulta desde smart-pc",
      );
      const mailBody = encodeURIComponent(
        (formData.get("message") as string) || "",
      );
      const name = encodeURIComponent((formData.get("name") as string) || "");
      window.location.href = `mailto:hola@smart-pc.com?subject=${subject}&body=${mailBody}%0A%0ADe: ${name}`;
      setStatus("success");
      return;
    }

    try {
      const res = await fetch(`https://formspree.io/f/${formspreeId}`, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
      } else {
        const json = await res.json();
        setErrorMsg(
          json?.errors?.[0]?.message || "Algo salió mal. Probá de nuevo.",
        );
        setStatus("error");
      }
    } catch {
      setErrorMsg("No se pudo enviar. Verificá tu conexión.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-8 text-center">
        <div className="mb-3 text-4xl">✅</div>
        <h3 className="mb-2 text-xl font-bold text-white">¡Mensaje enviado!</h3>
        <p className="text-white/60">Te respondemos en menos de 24 horas.</p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm text-[#22d3ee] hover:underline"
        >
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-medium text-white/70"
          >
            Nombre *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            placeholder="Tu nombre"
            className="w-full rounded-xl border border-white/10 bg-[#141b30] px-4 py-3 text-white placeholder-white/30 focus:border-[#22d3ee] focus:outline-none focus:ring-1 focus:ring-[#22d3ee]"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-white/70"
          >
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            placeholder="tu@email.com"
            className="w-full rounded-xl border border-white/10 bg-[#141b30] px-4 py-3 text-white placeholder-white/30 focus:border-[#22d3ee] focus:outline-none focus:ring-1 focus:ring-[#22d3ee]"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="subject"
          className="mb-1.5 block text-sm font-medium text-white/70"
        >
          Asunto *
        </label>
        <select
          id="subject"
          name="subject"
          required
          className="w-full rounded-xl border border-white/10 bg-[#141b30] px-4 py-3 text-white focus:border-[#22d3ee] focus:outline-none focus:ring-1 focus:ring-[#22d3ee]"
        >
          <option value="">Elegí un tema</option>
          <option value="Cotización PC a medida">Cotización PC a medida</option>
          <option value="Consulta pre-armada">Consulta pre-armada</option>
          <option value="Mantenimiento / Upgrade">
            Mantenimiento / Upgrade
          </option>
          <option value="Garantía / Soporte">Garantía / Soporte</option>
          <option value="Otro">Otro</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="message"
          className="mb-1.5 block text-sm font-medium text-white/70"
        >
          Mensaje *
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="Contanos en qué podemos ayudarte..."
          className="w-full rounded-xl border border-white/10 bg-[#141b30] px-4 py-3 text-white placeholder-white/30 focus:border-[#22d3ee] focus:outline-none focus:ring-1 focus:ring-[#22d3ee] resize-none"
        />
      </div>

      {status === "error" && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-xl bg-[#22d3ee] py-3.5 font-bold text-[#0c1324] transition-colors hover:bg-[#06b6d4] disabled:opacity-50"
      >
        {status === "loading" ? "Enviando..." : "Enviar mensaje"}
      </button>

      {!formspreeId && (
        <p className="text-center text-xs text-white/40">
          Formspree no configurado — se abrirá tu cliente de email
        </p>
      )}
    </form>
  );
}
