import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { priceCategories } from "@/lib/utils";
import PriceTable from "@/components/PriceTable";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollToTopOnRouteChange } from "@/components/ScrollToTop";

const Pricing = () => {
  const { t } = useTranslation();

  const pricingItems = [
    {
      title: "Machine à laver",
      weight: "6 Kg",
      price: "2 000 FCFA",
      badge: "45 min", // Pas de badge ici
    },
    {
      title: "Machine à laver",
      weight: "20 Kg",
      price: "4 000 FCFA",
      badge: "45 min", // Pas de badge ici
    },
    {
      title: "Séche-linge",
      weight: "13 Kg",
      price: "1 000 FCFA",
      badge: "20 min", // Ici on met 20 min
    },
  ];

  return (
    <>
      <ScrollToTopOnRouteChange />
      {/* Pricing Hero Section */}
      <section className="pt-24 md:pt-32 pb-8 md:pb-16 gradient-bg">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto">
            <motion.h1
              className="text-4xl md:text-5xl font-bold font-heading mb-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ color: "#00bf63" }}
            >
              {t("pricing.hero.title")}
            </motion.h1>
            <motion.p
              className="text-lg text-gray-600 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {t("pricing.hero.subtitle")}
            </motion.p>
          </div>
        </div>
      </section>

      {/* Price Cards Section */}
      <section id="tarifs" className="py-16 bg-white">
        <div className="container-custom">
          <motion.div
            className="p-6 rounded-xl shadow-md text-center mt-5 mb-5"
            style={{ backgroundColor: "#00bf63" }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-xl font-bold font-heading text-white">
              Machine en Libre-Service
            </h1>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingItems.map((item, index) => (
              <motion.div
                key={index}
                className="bg-white p-6 rounded-xl shadow-md"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <h5 className="text-xl font-bold font-heading mb-4">
                  {item.title}
                </h5>

                <div className="flex items-center gap-2 mb-4">
                  <h1 className="text-3xl font-bold">{item.weight}</h1>
                  {item.badge && (
                    <span
                      className="px-3 py-1 rounded-full text-sm font-semibold"
                      style={{ backgroundColor: "#5ce1e6", color: "#000" }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                <h6 className="text-2xl font-bold text-primary">
                  {item.price}
                </h6>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Price Tables Section */}
      <section id="tarifs" className="py-16 bg-white">
        <div className="container-custom">
          {priceCategories.map((category) => (
            <PriceTable key={category.id} category={category} />
          ))}

          {/* Special Request Note */}
          <motion.div
            className="bg-gray-50 p-6 rounded-xl shadow-md text-center mt-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-xl font-bold font-heading mb-2">
              {t("pricing.special.title")}
            </h3>
            <p className="text-gray-600 mb-4">
              {t("pricing.special.description")}
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/contact">
                <Button
                  variant="default"
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  {t("pricing.special.button")}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-12">
            <motion.h2
              className="text-3xl font-bold font-heading mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {t("pricing.faq.title")}
            </motion.h2>
            <motion.p
              className="text-gray-600 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {t("pricing.faq.subtitle")}
            </motion.p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="bg-white p-6 rounded-lg shadow-md"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <h3 className="text-lg font-bold font-heading mb-2">
                    {t(`pricing.faq.q${i}`)}
                  </h3>
                  <p className="text-gray-600">{t(`pricing.faq.a${i}`)}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Pricing;