import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock,
  SignalHigh,
  SignalLow,
  SignalMedium,
  PlayCircle,
} from "lucide-react"

export const categories = [
  {
    value: "bug",
    label: "Bug",
  },
  {
    value: "feature",
    label: "Feature",
  },
  {
    value: "documentation",
    label: "Docs",
  },
  {
    value: "improvement",
    label: "Improvement",
  },
  {
    value: "refactor",
    label: "Refactor",
  },
]

export const statuses = [
  {
    value: "pending",
    label: "Pending",
    icon: Clock,
  },
  {
    value: "todo",
    label: "Todo",
    icon: Circle,
  },
  {
    value: "in progress",
    label: "In Progress",
    icon: PlayCircle,
  },
  {
    value: "completed",
    label: "Completed",
    icon: CheckCircle2,
  },
]

export const priorities = [
  {
    label: "Minor",
    value: "minor",
    icon: SignalLow,
  },
  {
    label: "Normal",
    value: "normal",
    icon: SignalMedium,
  },
  {
    label: "Important",
    value: "important",
    icon: SignalHigh,
  },
  {
    label: "Critical",
    value: "critical",
    icon: AlertCircle,
  },
]
