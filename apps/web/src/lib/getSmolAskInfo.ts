import { INTENTS_MUMBAI } from '@lenster/data/constants';
import axios from 'axios';
const getSmolAskInfo = async () => {
  try {
    const response = await axios.get(`${INTENTS_MUMBAI}intents`);

    return response.data;
  } catch {
    return 0;
  }
};

export default getSmolAskInfo;
