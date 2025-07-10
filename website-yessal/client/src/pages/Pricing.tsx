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
      price: "1 500 FCFA",
      badge: "30 min", // Ici on met 20 min
      supplement: {
        text: "+ 500 FCFA",
        description: "par 10 min supp.",
      },
    },
  ];

  return (
    <>
      <ScrollToTopOnRouteChange />
      {/* Pricing Hero Section */}
      <section className="pt-16 md:pt-24 pb-6 md:pb-12 gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              className="text-lg text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {t("pricing.hero.subtitle")}
            </motion.p>
            <motion.p
              className="text-lg text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{ color: "#00bf63" }}
            >
              {t("pricing.hero.subtitle2")}
            </motion.p>
          </div>
        </div>
      </section>

      {/* Formule et Abonnement Section */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="p-4 md:p-6 rounded-2xl shadow-lg text-center mb-8 bg-gradient-to-r from-[#00bf63] to-[#5ce1e6]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-xl font-bold font-heading text-white">
              Formule et Abonnement
            </h1>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {/* Formule Standard */}
            <motion.div
              className="relative bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <div className="text-center">
                <h3 className="text-xl font-bold font-heading mb-3 text-gray-800">
                  Formule Standard
                </h3>

                <div className="mb-4">
                  <div className="text-3xl font-bold text-[#00bf63] mb-2">
                    Par Machine
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                    Options au choix
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Voir les tarifs en libre-service ci-dessous</p>
                  <p>• Option livraison</p>
                </div>
              </div>
            </motion.div>

            {/* Formule au Kilo */}
            <motion.div
              className="relative bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-[#5ce1e6]"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-[#00bf63] to-[#5ce1e6] text-white px-4 py-1 rounded-full text-xs font-semibold">
                  POPULAIRE
                </span>
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold font-heading mb-3 text-gray-800">
                  Formule au Kilo
                </h3>

                <div className="mb-4">
                  <div className="text-3xl font-bold text-[#5ce1e6] mb-2">
                    600 F/Kg
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-[#5ce1e6]/10 text-[#5ce1e6]">
                    Services inclus
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Lavage, Séchage et Repassage inclus</p>
                  <p>• Collecte et Livraison gratuite sur demande</p>
                </div>
              </div>
            </motion.div>

            {/* Abonnement */}
            <motion.div
              className="relative bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <div className="text-center">
                <h3 className="text-xl font-bold font-heading mb-3 text-gray-800">
                  Abonnement Mensuel
                </h3>

                <div className="mb-4">
                  <div className="text-3xl font-bold text-[#00bf63] mb-1">
                    15 000 F
                  </div>
                  <div className="text-lg text-gray-600 mb-2">40 Kg/mois</div>
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-[#00bf63]/10 text-[#00bf63]">
                    Économique
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Forfait mensuel avantageux</p>
                  <p>• Tous services inclus sauf option express</p>
                  <p>• Minimum 6 kg par lavage et maximun 4 lavages par mois</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Price Cards Section */}
      <section id="tarifs" className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="p-4 md:p-6 rounded-2xl shadow-lg text-center mb-8 bg-gradient-to-r from-[#00bf63] to-[#5ce1e6]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-xl font-bold font-heading text-white">
              Machine en Libre-Service
            </h1>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {pricingItems.map((item, index) => (
              <motion.div
                key={index}
                className="bg-white p-4 md:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <h5 className="text-xl font-bold font-heading mb-4 text-center">
                  {item.title}
                </h5>

                <div className="flex items-center gap-2 mb-4 justify-center">
                  <h1 className="text-3xl font-bold text-center self-center">
                    {item.weight}
                  </h1>
                  {item.badge && (
                    <span
                      className="text-center px-3 py-1 rounded-full text-sm font-semibold self-center"
                      style={{ backgroundColor: "#5ce1e6", color: "#000" }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                <h6 className="text-2xl font-bold text-primary text-center">
                  {item.price}
                </h6>
                {item.supplement && (
                  <div
                    className="mt-2 p-2 rounded-md flex flex-col gap-1"
                    style={{
                      backgroundColor: "#e8f5e9",
                      borderLeft: "3px solid #00bf63",
                    }}
                  >
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium text-white self-center"
                      style={{ backgroundColor: "#ff6b35" }}
                    >
                      {item.supplement.text}
                    </span>
                    <p
                      className="text-center text-xs"
                      style={{ color: "#1a73e8" }}
                    >
                      {item.supplement.description}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Price Tables Section */}
      <section id="tarifs" className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {priceCategories.map((category) => (
            <PriceTable key={category.id} category={category} />
          ))}

          {/* Special Request Note */}
          <motion.div
            className="p-4 md:p-6 rounded-2xl shadow-lg text-center mb-8 bg-gradient-to-r from-[#00bf63] to-[#5ce1e6]"
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
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

          <div className="max-w-4xl mx-auto">
            <div className="space-y-4 md:space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="bg-white p-4 md:p-6 rounded-lg shadow-md"
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
