
import { motion } from "framer-motion"

const ShoppingPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass rounded-xl p-8"
      >
        <h1 className="text-3xl font-bold mb-6">Shopping Lists</h1>
        <p className="text-gray-600">Shopping list management coming soon...</p>
      </motion.div>
    </div>
  )
}

export default ShoppingPage
