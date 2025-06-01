import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ContactForm from "@/components/ContactForm";
import GoogleMap from "@/components/ui/google-map";

const Contact = () => {
  const { t } = useTranslation();

  return (
    <>
      {/* Contact Hero Section */}
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
              {t("contact.hero.title")}
            </motion.h1>
            <motion.p 
              className="text-lg text-gray-600 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {t("contact.hero.subtitle")}
            </motion.p>
          </div>
        </div>
      </section>

      {/* Contact Form and Info Section */}
      <section id="contact" className="py-16 bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <ContactForm />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="bg-gray-50 p-6 rounded-xl shadow-lg mb-8">
                <h3 className="text-xl font-bold font-heading mb-4">{t("contact.info.title")}</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <FontAwesomeIcon icon="map-marker-alt" className="text-primary" />
                    </div>
                    <div className="ml-3">
                      <p className="text-gray-700">
                        {t("contact.address")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <FontAwesomeIcon icon="phone" className="text-primary" />
                    </div>
                    <div className="ml-3">
                      <p className="text-gray-700">{t("contact.phone")}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <FontAwesomeIcon icon="envelope" className="text-primary" />
                    </div>
                    <div className="ml-3">
                      <p className="text-gray-700">{t("contact.email")}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <FontAwesomeIcon icon="clock" className="text-primary" />
                    </div>
                    <div className="ml-3">
                      <p className="text-gray-700">
                        {t("contact.hours")}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <div className="flex space-x-4">
                    <a href="#" className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                      <FontAwesomeIcon icon={["fab", "facebook-f"]} />
                    </a>
                    <a href="#" className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                      <FontAwesomeIcon icon={["fab", "instagram"]} />
                    </a>
                    <a href="#" className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                      <FontAwesomeIcon icon={["fab", "whatsapp"]} />
                    </a>
                  </div>
                </div>
              </div>
              
              {/* Google Maps */}
              <GoogleMap address="Mbour 2, Thiès, Sénégal" />
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Contact;
