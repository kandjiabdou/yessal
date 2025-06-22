import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import LanguageSwitcher from "./LanguageSwitcher";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
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
    <nav
      className={cn(
        "fixed w-full z-50 transition-all duration-300",
        isScrolled ? "bg-white shadow-md" : "bg-white/95"
      )}
    >
      <div className="container-custom">
        <div className="flex justify-between py-2">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <img
                  src="/logo_yessal.png"
                  alt="Yessal Logo"
                  className="h-12 w-auto"
                />
                <div className="flex items-center justify-center leading-tight">
                  <span
                    className="font-heading font-bold"
                    style={{
                      color: "#00bf63",
                      fontSize: "30px",
                      lineHeight: "1",
                    }}
                  >
                    Yessal
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className={cn(
                    "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors",
                    location === link.href
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:border-primary hover:text-primary"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Language Selector */}
          {/* <div className="hidden sm:flex items-center">
            <LanguageSwitcher />
          </div> */}

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              type="button"
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-primary hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              aria-expanded={isOpen}
            >
              <span className="sr-only">
                {isOpen ? t("nav.close_menu") : t("nav.open_menu")}
              </span>
              <FontAwesomeIcon
                icon={isOpen ? "times" : "bars"}
                className="w-6 h-6"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="sm:hidden overflow-hidden"
          >
            <div className="pt-2 pb-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className={cn(
                    "block pl-3 pr-4 py-2 border-l-4 text-base font-medium",
                    location === link.href
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-primary hover:text-primary"
                  )}
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile language selector */}
              {/* <div className="flex items-center mt-3 ml-3">
                <LanguageSwitcher />
              </div> */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
