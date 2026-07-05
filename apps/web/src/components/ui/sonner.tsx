import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group z-[9999]"
      position="bottom-right"
      richColors={false}
      closeButton
      expand
      duration={5200}
      visibleToasts={5}
      gap={10}
      offset={18}
      icons={{
        success: <CheckCircle2 className="size-4 text-[#d8ff72]" />,
        error: <XCircle className="size-4 text-red-300" />,
        warning: <AlertTriangle className="size-4 text-amber-300" />,
        info: <Info className="size-4 text-cyan-300" />,
        loading: <Loader2 className="size-4 animate-spin text-[#d8ff72]" />,
      }}
      style={
        {
          "--normal-bg": "#10261d",
          "--normal-text": "#ffffff",
          "--normal-border": "rgba(216,255,114,.28)",
          "--success-bg": "#10261d",
          "--success-text": "#ffffff",
          "--success-border": "rgba(216,255,114,.42)",
          "--error-bg": "#2a1212",
          "--error-text": "#fff7f7",
          "--error-border": "rgba(248,113,113,.44)",
          "--warning-bg": "#2a210d",
          "--warning-text": "#fff8e6",
          "--warning-border": "rgba(251,191,36,.42)",
          "--info-bg": "#0e2430",
          "--info-text": "#effbff",
          "--info-border": "rgba(34,211,238,.36)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group/toast rounded-xl border px-4 py-3 shadow-[0_18px_50px_rgba(16,38,29,.24)] backdrop-blur-md",
          title: "text-sm font-semibold tracking-[-0.01em]",
          description: "mt-1 text-xs leading-5 !text-white/80 opacity-100",
          actionButton:
            "!bg-[#d8ff72] !text-[#10261d] hover:!bg-[#cfff4f]",
          cancelButton:
            "!border-white/15 !bg-white/5 !text-white hover:!bg-white/10",
          closeButton:
            "!border-white/25 !bg-[#10261d] !text-white/90 hover:!text-white",
          success: "!border-[#d8ff72]/45",
          error: "!border-red-300/45",
          warning: "!border-amber-300/45",
          info: "!border-cyan-300/40",
          loading: "!border-[#d8ff72]/35",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
