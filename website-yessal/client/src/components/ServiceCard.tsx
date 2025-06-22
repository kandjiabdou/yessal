import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Service } from "@/lib/utils";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface ServiceCardProps {
  service: Service;
}

const ServiceCard = ({ service }: ServiceCardProps) => {
  const { t } = useTranslation();
  
  return (
    <motion.div 
      className="bg-white rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl"
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className={`h-64 overflow-hidden flex items-center justify-center bg-gradient-to-r ${service.color}`}>
        <img 
          src={service.imageUrl} 
          alt={t(service.title)} 
          className="w-full h-full object-contain"
        />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold font-heading mb-2">{t(service.title)}</h3>
        <p className="text-gray-600 mb-4">
          {t(service.description)}
        </p>
        <Link 
          href="/tarifs"
          className="inline-block text-primary font-medium hover:underline"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          {t("service.view_pricing")} <FontAwesomeIcon icon="arrow-right" className="ml-1" />
        </Link>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
