import { useTranslation } from "react-i18next";
import { Feature } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";

interface FeatureCardProps {
  feature: Feature;
}

const FeatureCard = ({ feature }: FeatureCardProps) => {
  const { t } = useTranslation();
  
  return (
    <motion.div 
      className="text-center p-6"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <FontAwesomeIcon icon={feature.icon} className="text-2xl text-primary" />
      </div>
      <h3 className="text-xl font-bold font-heading mb-2">{t(feature.title)}</h3>
      <p className="text-gray-600">
        {t(feature.description)}
      </p>
    </motion.div>
  );
};

export default FeatureCard;
