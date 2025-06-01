import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const About = () => {
  const { t } = useTranslation();

  return (
    <>
      {/* About Hero Section */}
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
              {t("about.hero.title")}
            </motion.h1>
            <motion.p
              className="text-lg text-gray-600 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {t("about.hero.subtitle")}
            </motion.p>
          </div>
        </div>
      </section>

      {/* Main About Section */}
      <section id="about" className="py-16 bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Image Part */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative w-full min-h-[400px] md:min-h-[500px] rounded-xl overflow-hidden shadow-xl mb-6">
                <img
                  src="/image/site/histoire_yessal.png"
                  alt={t("about.main.image1_alt")}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            </motion.div>

            {/* Text Part */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3
                className="text-2xl font-bold font-heading mb-4"
                style={{ color: "#00bf63" }}
              >
                {t("about.main.history.title")}
              </h3>
              <p className="text-gray-600 mb-6">
                {t("about.main.history.content")}
              </p>

              <h3
                className="text-2xl font-bold font-heading mb-4"
                style={{ color: "#00bf63" }}
              >
                {t("about.main.mission.title")}
              </h3>
              <p className="text-gray-600 mb-6">
                {t("about.main.mission.content")}
              </p>

              <h3
                className="text-2xl font-bold font-heading mb-4"
                style={{ color: "#00bf63" }}
              >
                {t("about.main.team.title")}
              </h3>
              <p className="text-gray-600 mb-6">
                {t("about.main.team.content")}
              </p>

              {/* First Icon */}
              <div className="flex items-center space-x-4 mb-6">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#7df3ff" }}
                >
                  <FontAwesomeIcon
                    icon="check"
                    className="text-xl"
                    style={{ color: "#00bf63" }}
                  />
                </div>
                <div>
                  <h4
                    className="font-bold text-lg"
                    style={{ color: "#00bf63" }}
                  >
                    {t("about.main.quality.title")}
                  </h4>
                  <p className="text-gray-600">
                    {t("about.main.quality.content")}
                  </p>
                </div>
              </div>

              {/* Second Icon */}
              <div className="flex items-center space-x-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#7df3ff" }}
                >
                  <FontAwesomeIcon
                    icon="heart"
                    className="text-xl"
                    style={{ color: "#00bf63" }}
                  />
                </div>
                <div>
                  <h4
                    className="font-bold text-lg"
                    style={{ color: "#00bf63" }}
                  >
                    {t("about.main.service.title")}
                  </h4>
                  <p className="text-gray-600">
                    {t("about.main.service.content")}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
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
              {t("about.values.title")}
            </motion.h2>
            <motion.p
              className="text-gray-600 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {t("about.values.subtitle")}
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="bg-white p-6 rounded-xl shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <FontAwesomeIcon
                    icon={i === 1 ? "medal" : i === 2 ? "leaf" : "heart"}
                    className="text-2xl text-primary"
                  />
                </div>
                <h3 className="text-xl font-bold font-heading mb-2">
                  {t(`about.values.value${i}.title`)}
                </h3>
                <p className="text-gray-600">
                  {t(`about.values.value${i}.content`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default About;
