<script setup lang="ts">
import * as LucideIcons from 'lucide-vue-next';
import { computed } from 'vue';

type Props = {
  /** Name of the Lucide icon in kebab-case (e.g., 'chevron-right') */
  name: string;
  /** Size of the icon in pixels */
  size?: 'sm' | 'md' | 'lg' | 'full' | 'xs' | 'custom';
  /** Custom size of the icon in pixels */
  customSize?: number;
  /** Stroke width of the icon */
  strokeWidth?: number;
  /** Custom CSS class to apply to the icon */
  class?: string;
  /** Color of the icon (CSS color value) */
  color?: string;
  /** Optional click handler */
  onClick?: () => void;
  stroke?: string;
  fill?: string;
};

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  customSize: 0,
  strokeWidth: 2.2,
  class: '',
  color: 'currentColor',
  stroke: 'currentColor',
});

// Map of icon names to components
const iconMap: Record<string, any> = {
  // Navigation
  'chevron-left': LucideIcons.ChevronLeft,
  'chevron-right': LucideIcons.ChevronRight,
  'chevron-up': LucideIcons.ChevronUp,
  'chevron-down': LucideIcons.ChevronDown,
  'chevrons-up-down': LucideIcons.ChevronsUpDown,
  'corner-down-right': LucideIcons.CornerDownRight,
  'refresh-cw': LucideIcons.RefreshCw,
  database: LucideIcons.Database,
  'arrow-up-down': LucideIcons.ArrowDownUp,

  component: LucideIcons.Component,
  run: LucideIcons.Play,
  cpu: LucideIcons.Cpu,

  'audio-lines': LucideIcons.AudioLines,
  'maximize-2': LucideIcons.Maximize2,

  'minimize-2': LucideIcons.Minimize2,
  'thumbs-up': LucideIcons.ThumbsUp,

  paperclip: LucideIcons.Paperclip,

  'circle-dot': LucideIcons.CircleDot,
  receipt: LucideIcons.Receipt,

  'git-fork': LucideIcons.GitFork,

  'arrow-left': LucideIcons.ArrowLeft,
  'arrow-right': LucideIcons.ArrowRight,
  'arrow-up': LucideIcons.ArrowUp,
  'arrow-down': LucideIcons.ArrowDown,
  'arrow-down-up': LucideIcons.ArrowDownUp,
  'sliders-horizontal': LucideIcons.SlidersHorizontal,
  heart: LucideIcons.Heart,
  back: LucideIcons.ChevronLeft,
  menu: LucideIcons.Menu,
  home: LucideIcons.Home,
  settings: LucideIcons.Settings,
  x: LucideIcons.X,
  'external-link': LucideIcons.ExternalLink,

  square: LucideIcons.Square,
  triangle: LucideIcons.Triangle,
  circle: LucideIcons.Circle,

  zap: LucideIcons.Zap,

  bolt: LucideIcons.Bolt,

  'list-filter': LucideIcons.ListFilter,

  // Layout
  'layout-grid': LucideIcons.LayoutGrid,
  'layout-list': LucideIcons.List,
  'layout-dashboard': LucideIcons.LayoutDashboard,

  'shield-check': LucideIcons.ShieldCheck,
  'life-buoy': LucideIcons.LifeBuoy,

  // Actions
  edit: LucideIcons.Pencil,
  delete: LucideIcons.Trash2,
  plus: LucideIcons.Plus,
  minus: LucideIcons.Minus,
  check: LucideIcons.Check,
  search: LucideIcons.Search,
  download: LucideIcons.Download,
  upload: LucideIcons.Upload,
  refresh: LucideIcons.RefreshCw,
  eye: LucideIcons.Eye,
  'eye-off': LucideIcons.EyeOff,
  copy: LucideIcons.Copy,
  clipboard: LucideIcons.Clipboard,
  save: LucideIcons.Save,
  star: LucideIcons.Star,
  'circle-arrow-up': LucideIcons.CircleArrowUp,

  // Communication
  mail: LucideIcons.Mail,
  message: LucideIcons.MessageSquare,
  send: LucideIcons.Send,
  bell: LucideIcons.Bell,
  mic: LucideIcons.Mic,
  'mic-off': LucideIcons.MicOff,

  // Users
  user: LucideIcons.User,
  users: LucideIcons.Users,
  'user-plus': LucideIcons.UserPlus,
  'log-out': LucideIcons.LogOut,
  'log-in': LucideIcons.LogIn,
  lock: LucideIcons.Lock,

  // Data
  file: LucideIcons.File,
  folder: LucideIcons.Folder,
  image: LucideIcons.Image,
  calendar: LucideIcons.Calendar,
  clock: LucideIcons.Clock,
  layers: LucideIcons.Layers,
  images: LucideIcons.Images,

  // UI Elements
  'more-horizontal': LucideIcons.MoreHorizontal,
  'more-vertical': LucideIcons.MoreVertical,
  filter: LucideIcons.Filter,
  sort: LucideIcons.ArrowUpDown,
  info: LucideIcons.Info,
  alert: LucideIcons.AlertCircle,
  help: LucideIcons.HelpCircle,

  repeat: LucideIcons.Repeat,
  'repeat-2': LucideIcons.Repeat2,

  library: LucideIcons.Library,

  // Layout
  ellipsis: LucideIcons.Ellipsis,
  'ellipsis-vertical': LucideIcons.EllipsisVertical,

  sparkles: LucideIcons.Sparkles,
  thermometer: LucideIcons.Thermometer,

  'full-text': LucideIcons.FileText,

  sparkle: LucideIcons.Sparkle,

  video: LucideIcons.Video,
  'message-circle-question': LucideIcons.MessageCircleQuestion,

  diamond: LucideIcons.Diamond,
  'rectangle-vertical': LucideIcons.RectangleVertical,
  hexagon: LucideIcons.Hexagon,

  cross: LucideIcons.Cross,
  play: LucideIcons.Play,

  split: LucideIcons.Split,
};

// Get the icon component or use HelpCircle as fallback
const Icon = computed(() => {
  return iconMap[props.name] || LucideIcons.HelpCircle;
});

const classes = computed(() => {
  return {
    [props.class]: props.class,
    [`size-${props.size}`]: props.size !== 'custom',
    'size-custom': props.size === 'custom',
  };
});
</script>

<template>
  <div class="icon" :class="classes" @click="onClick">
    <component
      :is="Icon"
      :style="{
        width: props.customSize ? `${props.customSize}px` : undefined,
        height: props.customSize ? `${props.customSize}px` : undefined,
      }"
      :stroke-width="strokeWidth"
      :color="color"
      :fill="fill || 'currentColor'"
      :stroke="stroke || 'currentColor'"
    />
  </div>
</template>

<style scoped>
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  pointer-events: none;
}

.size-sm {
  width: 1.3rem;
  height: 1.3rem;
}

.size-xs {
  width: 1rem;
  height: 1rem;
}

.size-md {
  width: 1.7rem;
  height: 1.7rem;
}

.size-lg {
  width: 2rem;
  height: 2rem;
}

.size-full {
  width: 100%;
  height: 100%;
}

.svg-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.svg-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
