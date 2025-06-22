import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/i18n";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Font Awesome setup
import { library } from '@fortawesome/fontawesome-svg-core';
import { 
  faBars, faTimes, faMapMarkerAlt, faPhone, faEnvelope, 
  faClock, faCheck, faHeart, faMedal, faLeaf, faMoneyBillWave,
  faChevronUp, faStar, faStarHalfAlt, faArrowRight, faWater,
  faSpinner, faShirt, faTshirt, faSocks, faTint, faChevronLeft,
  faChevronRight, faPercentage, faTag
} from '@fortawesome/free-solid-svg-icons';
import { 
  faFacebookF, faInstagram, faWhatsapp 
} from '@fortawesome/free-brands-svg-icons';

// Add icons to library
library.add(
  faBars, faTimes, faMapMarkerAlt, faPhone, faEnvelope, 
  faClock, faCheck, faHeart, faMedal, faLeaf, faMoneyBillWave,
  faFacebookF, faInstagram, faWhatsapp, faChevronUp, faStar, 
  faStarHalfAlt, faArrowRight, faWater, faSpinner, faShirt,
  faTshirt, faSocks, faTint, faChevronLeft, faChevronRight,
  faPercentage, faTag
);

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
