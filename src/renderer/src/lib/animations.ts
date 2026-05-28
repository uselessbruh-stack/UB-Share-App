// ===================================================================
// UB-Share — Framer Motion Animation Presets
// Reusable animation variants for consistent UX
// ===================================================================

import type { Variants, Transition } from 'framer-motion'

// ----- Transitions -----

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30
}

export const smoothTransition: Transition = {
  type: 'tween',
  ease: [0.4, 0, 0.2, 1],
  duration: 0.3
}

export const quickTransition: Transition = {
  type: 'tween',
  ease: [0.4, 0, 0.2, 1],
  duration: 0.15
}

// ----- Page Transitions -----

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 }
}

export const pageTransition: Transition = {
  type: 'tween',
  ease: [0.4, 0, 0.2, 1],
  duration: 0.25
}

// ----- List Item Animations -----

export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      type: 'tween',
      ease: [0.4, 0, 0.2, 1],
      duration: 0.3
    }
  }),
  exit: {
    opacity: 0,
    x: -12,
    transition: { duration: 0.2 }
  }
}

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1
    }
  }
}

// ----- Modal Animations -----

export const modalOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
}

export const modalContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springTransition
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: quickTransition
  }
}

// ----- Hover/Tap Effects -----

export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: quickTransition
}

export const hoverLift = {
  whileHover: { y: -2 },
  transition: smoothTransition
}

// ----- Fade Variants -----

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
}

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 }
}

// ----- Slide Variants -----

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
}

// ----- Notification -----

export const notificationVariants: Variants = {
  hidden: { opacity: 0, y: -20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springTransition
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: quickTransition
  }
}
