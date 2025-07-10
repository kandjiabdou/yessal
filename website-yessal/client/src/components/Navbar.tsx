import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const navLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/tarifs", label: t("nav.pricing") },
    { href: "/about", label: t("nav.about") },
    { href: "/contact", label: t("nav.contact") },
  ];

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        "fixed w-full z-50 transition-all duration-500",
        isScrolled 
          ? "backdrop-blur-xl bg-white/80 shadow-lg shadow-black/5" 
          : "backdrop-blur-md bg-white/60"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-shrink-0"
          >
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <img
                  src="/logo_yessal.png"
                  alt="Yessal Logo"
                  className="h-10 w-auto transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <span
                className="font-heading font-bold text-2xl bg-gradient-to-r from-[#00bf63] to-[#5ce1e6] bg-clip-text text-transparent"
              >
                Yessal
              </span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {navLinks.map((link, index) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
              >
                <Link
                  href={link.href}
                  onClick={closeMenu}
                  className={cn(
                    "relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 group",
                    location === link.href
                      ? "bg-gradient-to-r from-[#00bf63] to-[#5ce1e6] text-white shadow-lg shadow-[#00bf63]/25"
                      : "text-gray-700 hover:bg-white/50 hover:shadow-md hover:shadow-black/5"
                  )}
                >
                  <span className="relative z-10">{link.label}</span>
                  {location === link.href && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-[#00bf63] to-[#5ce1e6] rounded-full"
                      style={{ zIndex: -1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={toggleMenu}
              className={cn(
                "relative p-2 rounded-xl backdrop-blur-sm transition-all duration-300",
                isOpen 
                  ? "bg-gradient-to-r from-[#00bf63] to-[#5ce1e6] text-white shadow-lg" 
                  : "bg-white/40 text-gray-700 hover:bg-white/60"
              )}
            >
              <span className="sr-only">
                {isOpen ? t("nav.close_menu") : t("nav.open_menu")}
              </span>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <FontAwesomeIcon
                  icon={isOpen ? "times" : "bars"}
                  className="w-5 h-5"
                />
              </motion.div>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="md:hidden overflow-hidden backdrop-blur-xl bg-white/90"
          >
            <div className="px-4 py-6 space-y-3">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                >
                  <Link
                    href={link.href}
                    onClick={closeMenu}
                    className={cn(
                      "block px-6 py-3 rounded-xl text-base font-medium transition-all duration-300",
                      location === link.href
                        ? "bg-gradient-to-r from-[#00bf63] to-[#5ce1e6] text-white shadow-lg transform scale-105"
                        : "text-gray-700 hover:bg-white/50 hover:shadow-md active:scale-95"
                    )}
                  >
                    <motion.span
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      {link.label}
                    </motion.span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
