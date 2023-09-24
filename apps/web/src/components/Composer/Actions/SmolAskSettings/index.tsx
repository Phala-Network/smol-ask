import { SparklesIcon } from '@heroicons/react/24/solid';
import { Tooltip } from '@lenster/ui';
import { t } from '@lingui/macro';
import { motion } from 'framer-motion';
import type { FC } from 'react';
import { usePublicationStore } from 'src/store/publication';

const SmolAskSettings: FC = () => {
  const showSmolAskEditor = usePublicationStore(
    (state) => state.showSmolAskEditor
  );
  const setSmolAskEditor = usePublicationStore(
    (state) => state.setShowSmolAskEditor
  );
  const resetSmolAskConfig = usePublicationStore(
    (state) => state.resetSmolAskConfig
  );

  return (
    <Tooltip placement="top" content={t`Smol ask`}>
      <motion.button
        whileTap={{ scale: 0.9 }}
        type="button"
        onClick={() => {
          resetSmolAskConfig();
          setSmolAskEditor(!showSmolAskEditor);
        }}
        aria-label="Smol ask"
      >
        <SparklesIcon className="text-brand h-5 w-5" />
      </motion.button>
    </Tooltip>
  );
};

export default SmolAskSettings;
