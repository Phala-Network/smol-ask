import {
  CursorArrowRaysIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline';
import { ADMIN_ADDRESS } from '@lenster/data/constants';
import { PUBLICATION } from '@lenster/data/tracking';
import type { Publication } from '@lenster/lens';
import getZoraChainIsMainnet from '@lenster/lib/nft/getZoraChainIsMainnet';
import stopEventPropagation from '@lenster/lib/stopEventPropagation';
import type { ZoraNftMetadata } from '@lenster/types/zora-nft';
import { Button, Card, Modal, Tooltip } from '@lenster/ui';
import getZoraChainInfo from '@lib/getZoraChainInfo';
import { Leafwatch } from '@lib/leafwatch';
import { t, Trans } from '@lingui/macro';
import Link from 'next/link';
import { type FC, useState } from 'react';
import useZoraNft from 'src/hooks/zora/useZoraNft';

import Mint, { useZoraMintStore } from './Mint';
import NftShimmer from './Shimmer';

interface NftProps {
  nftMetadata: ZoraNftMetadata;
  publication: Publication;
}

const Nft: FC<NftProps> = ({ nftMetadata, publication }) => {
  const { chain, address, token } = nftMetadata;
  const [showMintModal, setShowMintModal] = useState(false);
  const { setQuantity, setCanMintOnLenster } = useZoraMintStore();

  const {
    data: nft,
    loading,
    error
  } = useZoraNft({
    chain,
    address,
    token: token,
    enabled: Boolean(chain && address)
  });

  if (loading) {
    return <NftShimmer />;
  }

  if (!nft) {
    return null;
  }

  if (error) {
    return null;
  }

  const canMint = [
    'ERC721_DROP',
    'ERC721_SINGLE_EDITION',
    'ERC1155_COLLECTION_TOKEN'
  ].includes(nft.contractType);

  const network = getZoraChainIsMainnet(chain) ? '' : 'testnet.';
  const zoraLink = `https://${network}zora.co/collect/${chain}:${address}${
    token ? `/${token}` : ''
  }?referrer=${ADMIN_ADDRESS}`;

  return (
    <Card
      className="mt-3"
      forceRounded
      onClick={(event) => stopEventPropagation(event)}
    >
      <img
        src={`https://remote-image.decentralized-content.com/image?url=${nft.coverImageUrl}&w=1200&q=75`}
        className="h-[400px] max-h-[400px] w-full rounded-t-xl object-cover"
      />
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center space-x-2">
          <Tooltip
            placement="right"
            content={getZoraChainInfo(nft.chainId).name}
          >
            <img src={getZoraChainInfo(nft.chainId).logo} className="h-5 w-5" />
          </Tooltip>
          <div className="text-sm font-bold">{nft.name}</div>
          {nft.contractType === 'ERC1155_COLLECTION' ? (
            <Tooltip placement="right" content={t`ERC-1155 Collection`}>
              <RectangleStackIcon className="h-4 w-4" />
            </Tooltip>
          ) : null}
        </div>
        {canMint ? (
          <>
            <Button
              className="text-sm"
              icon={<CursorArrowRaysIcon className="h-4 w-4" />}
              size="md"
              onClick={() => {
                setQuantity(1);
                setCanMintOnLenster(false);
                setShowMintModal(true);
                Leafwatch.track(PUBLICATION.OPEN_ACTIONS.NFT.OPEN_MINT, {
                  publication_id: publication.id
                });
              }}
            >
              <Trans>Mint</Trans>
            </Button>
            <Modal
              title={t`Mint on Zora`}
              show={showMintModal}
              icon={<CursorArrowRaysIcon className="text-brand h-5 w-5" />}
              onClose={() => setShowMintModal(false)}
            >
              <Mint nft={nft} zoraLink={zoraLink} publication={publication} />
            </Modal>
          </>
        ) : (
          <Link href={zoraLink} target="_blank" rel="noopener noreferrer">
            <Button
              className="text-sm"
              icon={<CursorArrowRaysIcon className="h-4 w-4" />}
              size="md"
              onClick={() =>
                Leafwatch.track(PUBLICATION.OPEN_ACTIONS.NFT.OPEN_ZORA_LINK, {
                  publication_id: publication.id,
                  from: 'mint_embed'
                })
              }
            >
              {nft.contractType === 'ERC1155_COLLECTION' ? (
                <Trans>Mint all on Zora</Trans>
              ) : (
                <Trans>Mint on Zora</Trans>
              )}
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
};

export default Nft;
