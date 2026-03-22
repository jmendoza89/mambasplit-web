import { AnimatePresence, motion } from "motion/react";

export default function Alerts({ error, success }) {
  return (
    <section className="alerts" aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        {error ? (
          <motion.p
            key={`error:${error}`}
            className="alert"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {error}
          </motion.p>
        ) : null}
        {success ? (
          <motion.p
            key={`success:${success}`}
            className="alert alert-success"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
          >
            {success}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
