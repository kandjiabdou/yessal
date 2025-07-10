import { useTranslation } from "react-i18next";
import { PriceCategory } from "@/lib/utils";
import { motion } from "framer-motion";

interface PriceTableProps {
  category: PriceCategory;
}

const PriceTable = ({ category }: PriceTableProps) => {
  const { t } = useTranslation();

  return (
    <motion.div
      className="bg-white rounded-xl shadow-lg overflow-hidden mb-10"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="p-4 md:p-6 rounded-2xl shadow-lg text-center mb-8 bg-gradient-to-r from-[#00bf63] to-[#5ce1e6]"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h3 className="text-xl font-bold text-center">{t(category.title)}</h3>
      </motion.div>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-1/2 px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {category.columns.first}
                {category.columns.firstSub && (
                  <div className="text-[10px] font-normal normal-case">
                    {category.columns.firstSub}
                  </div>
                )}
              </th>
              <th className="w-1/2 px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {category.columns.second}
                {category.columns.secondSub && (
                  <div className="text-[10px] font-normal normal-case">
                    {category.columns.secondSub}
                  </div>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-center">
            {category.items.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {item.price}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {item.duration}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default PriceTable;
