import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { services, features } from "@/lib/utils";
import ServiceCard from "@/components/ServiceCard";
import FeatureCard from "@/components/FeatureCard";
import PromoSlider from "@/components/PromoSlider";

const Home = () => {
  const { t } = useTranslation();

  return (
    <>
      {/* Hero Section */}
      <section className="pt-24 md:pt-32 pb-12 md:pb-20 gradient-bg">
        <div className="container-custom">
          <div className="flex flex-col lg:flex-row items-center">
            <motion.div
              className="lg:w-1/2 mb-10 lg:mb-0 lg:pr-10"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="font-bold font-heading leading-tight mb-4">
                <span
                  className="block text-5xl md:text-6xl"
                  style={{ color: "#00bf63" }}
                >
                  {t("home.hero.title_highlighted")}
                </span>
                <span
                  className="block text-3xl md:text-4xl mt-2"
                  style={{ color: "#5ce1e6" }}
                >
                  {t("home.hero.title")}
                </span>
              </h1>

              <p className="text-lg text-gray-600 mb-8">
                {t("home.hero.description")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href="/tarifs"
                    className="inline-block bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    {t("home.hero.cta_pricing")}
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href="/contact"
                    className="inline-block bg-white border-2 border-primary text-primary hover:bg-primary/5 font-medium py-3 px-6 rounded-lg transition-all"
                  >
                    {t("home.hero.cta_contact")}
                  </Link>
                </motion.div>
              </div>
            </motion.div>
            <motion.div
              className="lg:w-1/2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="relative rounded-xl overflow-hidden shadow-2xl">
                <img
                  src="/image/site/baniere_accueil.png"
                  alt={t("home.hero.image_alt")}
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-primary/10"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Promo Section */}
      <section className="py-16 bg-secondary/5">
        <div className="container-custom">
          <div className="text-center mb-12">
            <motion.h2
              className="text-3xl font-bold font-heading mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {t("home.promos.title")}
            </motion.h2>
            <motion.p
              className="text-gray-600 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {t("home.promos.subtitle")}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <PromoSlider />
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <motion.h2
              className="text-3xl font-bold font-heading mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {t("home.services.title")}
            </motion.h2>
            <motion.p
              className="text-gray-600 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {t("home.services.subtitle")}
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
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
              {t("home.features.title")}
            </motion.h2>
            <motion.p
              className="text-gray-600 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {t("home.features.subtitle")}
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary">
        <div className="container-custom">
          <div className="text-center">
            <motion.h2
              className="text-3xl font-bold font-heading text-white mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {t("home.cta.title")}
            </motion.h2>
            <motion.p
              className="text-white/80 max-w-2xl mx-auto mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {t("home.cta.subtitle")}
            </motion.p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link
                href="/contact"
                className="inline-block bg-white text-primary font-medium py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              >
                {t("home.cta.button")}
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
