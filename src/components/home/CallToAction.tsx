import { useNavigate } from 'react-router-dom';

const CallToAction = () => {
  return (
    <div className="container px-4 md:px-6">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <div className="bg-emerald-50/90 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-8 shadow-sm">
          <h2 className="text-3xl font-bold text-emerald-700 dark:text-emerald-500">Moving Out of Dorms?</h2>
          <p className="text-lg text-emerald-600 dark:text-emerald-400 mt-4">
            Don't throw away your college items! List them on SRM Mart and help fellow students
            find affordable essentials while earning some extra cash.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CallToAction;
