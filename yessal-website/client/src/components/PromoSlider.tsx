import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface Promotion {
  id: number;
  title: string;
  description: string;
  color: string;
  imageSrc: string;
}

const PromoSlider = () => {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);

  const promotions: Promotion[] = [
    {
      id: 1,
      title: t("home.promos.promo1.title"),
      description: t("home.promos.promo1.description"),
      color: "from-primary to-secondary",
      imageSrc: "/image/site/lancement_yessal.png",
    },
    {
      id: 2,
      title: t("home.promos.promo3.title"),
      description: t("home.promos.promo3.description"),
      color: "from-primary to-secondary",
      imageSrc: "/image/site/reduction_etudiante.png",
    },
    {
      id: 3,
      title: t("home.promos.promo4.title"),
      description: t("home.promos.promo4.description"),
      color: "from-primary to-secondary",
      imageSrc: "/image/site/carte_fidelite.png",
    },
    {
      id: 4,
      title: t("home.promos.promo2.title"),
      description: t("home.promos.promo2.description"),
      color: "from-primary to-secondary",
      imageSrc: "/image/site/pack_familial.png",
    },
  ];

  // Auto-advance slides every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % promotions.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [promotions.length]);

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % promotions.length);
  };

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + promotions.length) % promotions.length);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl shadow-xl">
      {/* Slides */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <div
            className={`w-full bg-gradient-to-r ${promotions[current].color} p-8 flex items-center`}
          >
            <div className="container-custom flex flex-col md:flex-row items-center w-full">
              {/* Text */}
              <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8 text-white">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  {promotions[current].title}
                </h3>
                <p className="mb-6 text-white/90">
                  {promotions[current].description}
                </p>
                <Link href="/tarifs">
                  <Button className="bg-white text-primary hover:bg-white/90 font-medium">
                    {t("home.hero.cta_pricing")}
                  </Button>
                </Link>
              </div>

              {/* Image */}
              <div className="md:w-1/2 flex justify-center items-center">
                <div className="relative w-full">
                  <img
                    src={promotions[current].imageSrc}
                    alt={promotions[current].title}
                    className="w-full h-auto max-h-[600px] object-contain mx-auto rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/50 text-white p-3 rounded-full z-10 backdrop-blur-sm transition-all"
        aria-label="Previous slide"
      >
        <FontAwesomeIcon icon="chevron-left" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/50 text-white p-3 rounded-full z-10 backdrop-blur-sm transition-all"
        aria-label="Next slide"
      >
        <FontAwesomeIcon icon="chevron-right" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
        {promotions.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === current ? "bg-white scale-110" : "bg-white/50"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default PromoSlider;
