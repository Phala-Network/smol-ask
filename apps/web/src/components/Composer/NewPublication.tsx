import QuotedPublication from '@components/Publication/QuotedPublication';
import Attachments from '@components/Shared/Attachments';
import { AudioPublicationSchema } from '@components/Shared/Audio';
import Wrapper from '@components/Shared/Embed/Wrapper';
import EmojiPicker from '@components/Shared/EmojiPicker';
import withLexicalContext from '@components/Shared/Lexical/withLexicalContext';
import {
  ChatBubbleLeftRightIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import type {
  CollectCondition,
  EncryptedMetadata,
  FollowCondition,
  LensEnvironment
} from '@lens-protocol/sdk-gated';
import { LensGatedSDK } from '@lens-protocol/sdk-gated';
import type {
  AccessConditionOutput,
  CreatePublicPostRequest
} from '@lens-protocol/sdk-gated/dist/graphql/types';
import { LensHub } from '@lenster/abis';
import {
  ALLOWED_AUDIO_TYPES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  APP_NAME,
  LENSHUB_PROXY,
  LIT_PROTOCOL_ENVIRONMENT
} from '@lenster/data/constants';
import { Errors } from '@lenster/data/errors';
import { PUBLICATION } from '@lenster/data/tracking';
import type {
  CreatePublicCommentRequest,
  MetadataAttributeInput,
  Publication,
  PublicationMetadataMediaInput,
  PublicationMetadataV2Input
} from '@lenster/lens';
import {
  CollectModules,
  PublicationDocument,
  PublicationMainFocus,
  PublicationMetadataDisplayTypes,
  ReferenceModules,
  useBroadcastDataAvailabilityMutation,
  useBroadcastMutation,
  useCreateCommentTypedDataMutation,
  useCreateCommentViaDispatcherMutation,
  useCreateDataAvailabilityCommentTypedDataMutation,
  useCreateDataAvailabilityCommentViaDispatcherMutation,
  useCreateDataAvailabilityPostTypedDataMutation,
  useCreateDataAvailabilityPostViaDispatcherMutation,
  useCreatePostTypedDataMutation,
  useCreatePostViaDispatcherMutation,
  usePublicationLazyQuery
} from '@lenster/lens';
import { useApolloClient } from '@lenster/lens/apollo';
import getSignature from '@lenster/lib/getSignature';
import type { IGif } from '@lenster/types/giphy';
import type { NewLensterAttachment } from '@lenster/types/misc';
import { Button, Card, ErrorMessage, Spinner } from '@lenster/ui';
import cn from '@lenster/ui/cn';
import { $convertFromMarkdownString } from '@lexical/markdown';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import collectModuleParams from '@lib/collectModuleParams';
import errorToast from '@lib/errorToast';
import getTextNftUrl from '@lib/getTextNftUrl';
import getUserLocale from '@lib/getUserLocale';
import { Leafwatch } from '@lib/leafwatch';
import uploadToArweave from '@lib/uploadToArweave';
import { t } from '@lingui/macro';
import { useUnmountEffect } from 'framer-motion';
import { $getRoot } from 'lexical';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { OptmisticPublicationType } from 'src/enums';
import useCreatePoll from 'src/hooks/useCreatePoll';
import useCreateSmolAsk from 'src/hooks/useCreateSmolAsk';
import useEthersWalletClient from 'src/hooks/useEthersWalletClient';
import useHandleWrongNetwork from 'src/hooks/useHandleWrongNetwork';
import { useAccessSettingsStore } from 'src/store/access-settings';
import { useAppStore } from 'src/store/app';
import { useCollectModuleStore } from 'src/store/collect-module';
import { useGlobalModalStateStore } from 'src/store/modals';
import { useNonceStore } from 'src/store/nonce';
import { usePublicationStore } from 'src/store/publication';
import { useReferenceModuleStore } from 'src/store/reference-module';
import { useTransactionPersistStore } from 'src/store/transaction';
import { useEffectOnce, useUpdateEffect } from 'usehooks-ts';
import { v4 as uuid } from 'uuid';
import { useContractWrite, usePublicClient, useSignTypedData } from 'wagmi';

import PollEditor from './Actions/PollSettings/PollEditor';
import SmolAskEditor from './Actions/SmolAskSettings/SmolAskEditor';
import Editor from './Editor';
import Discard from './Post/Discard';

import { parseEther } from 'viem'

const CHAIN_NAME: {[name: string]: string} = {
  mumbai: 'Polygon Mumbai',
  polygonzkevm: 'Polygon zkEVM',
  linea: 'Linea',
  scroll: 'Scroll',
};

const Attachment = dynamic(
  () => import('@components/Composer/Actions/Attachment'),
  {
    loading: () => <div className="shimmer mb-1 h-5 w-5 rounded-lg" />
  }
);
const Gif = dynamic(() => import('@components/Composer/Actions/Gif'), {
  loading: () => <div className="shimmer mb-1 h-5 w-5 rounded-lg" />
});
const CollectSettings = dynamic(
  () => import('@components/Composer/Actions/CollectSettings'),
  {
    loading: () => <div className="shimmer mb-1 h-5 w-5 rounded-lg" />
  }
);
const ReferenceSettings = dynamic(
  () => import('@components/Composer/Actions/ReferenceSettings'),
  {
    loading: () => <div className="shimmer mb-1 h-5 w-5 rounded-lg" />
  }
);
const AccessSettings = dynamic(
  () => import('@components/Composer/Actions/AccessSettings'),
  {
    loading: () => <div className="shimmer mb-1 h-5 w-5 rounded-lg" />
  }
);
const PollSettings = dynamic(
  () => import('@components/Composer/Actions/PollSettings'),
  {
    loading: () => <div className="shimmer mb-1 h-5 w-5 rounded-lg" />
  }
);

const SmolAskSettings = dynamic(
  () => import('@components/Composer/Actions/SmolAskSettings'),
  {
    loading: () => <div className="shimmer mb-1 h-5 w-5 rounded-lg" />
  }
);

interface NewPublicationProps {
  publication: Publication;
}

const NewPublication: FC<NewPublicationProps> = ({ publication }) => {
  const { push } = useRouter();
  const { cache } = useApolloClient();
  const currentProfile = useAppStore((state) => state.currentProfile);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  // Modal store
  const setShowNewPostModal = useGlobalModalStateStore(
    (state) => state.setShowNewPostModal
  );
  const setShowDiscardModal = useGlobalModalStateStore(
    (state) => state.setShowDiscardModal
  );

  // Nonce store
  const { userSigNonce, setUserSigNonce } = useNonceStore();

  // Publication store
  const {
    publicationContent,
    setPublicationContent,
    quotedPublication,
    setQuotedPublication,
    audioPublication,
    attachments,
    setAttachments,
    addAttachments,
    isUploading,
    videoThumbnail,
    setVideoThumbnail,
    videoDurationInSeconds,
    showPollEditor,
    setShowPollEditor,
    resetPollConfig,
    pollConfig,
    showSmolAskEditor,
    setShowSmolAskEditor,
    resetSmolAskConfig,
    smolAskConfig
  } = usePublicationStore();

  // Transaction persist store
  const { txnQueue, setTxnQueue } = useTransactionPersistStore(
    (state) => state
  );

  // Collect module store
  const { collectModule, reset: resetCollectSettings } = useCollectModuleStore(
    (state) => state
  );

  // Reference module store
  const { selectedReferenceModule, onlyFollowers, degreesOfSeparation } =
    useReferenceModuleStore();

  // Access module store
  const {
    restricted,
    followToView,
    collectToView,
    reset: resetAccessSettings
  } = useAccessSettingsStore();

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [publicationContentError, setPublicationContentError] = useState('');

  const [editor] = useLexicalComposerContext();
  const publicClient = usePublicClient();
  const { data: walletClient } = useEthersWalletClient();
  const [createPoll] = useCreatePoll();
  const [createSmolAsk] = useCreateSmolAsk();
  const handleWrongNetwork = useHandleWrongNetwork();

  const isComment = Boolean(publication);
  const hasAudio = ALLOWED_AUDIO_TYPES.includes(
    attachments[0]?.original.mimeType
  );
  const hasVideo = ALLOWED_VIDEO_TYPES.includes(
    attachments[0]?.original.mimeType
  );

  // Dispatcher
  const canUseRelay = currentProfile?.dispatcher?.canUseRelay;
  const isSponsored = currentProfile?.dispatcher?.sponsor;

  const onCompleted = (__typename?: 'RelayError' | 'RelayerResult') => {
    if (__typename === 'RelayError') {
      return;
    }

    setIsLoading(false);
    editor.update(() => {
      $getRoot().clear();
    });
    setPublicationContent('');
    setQuotedPublication(null);
    setShowPollEditor(false);
    resetPollConfig();
    setShowSmolAskEditor(false);
    resetSmolAskConfig();
    setAttachments([]);
    setVideoThumbnail({
      url: '',
      type: '',
      uploading: false
    });
    resetCollectSettings();
    resetAccessSettings();

    if (!isComment) {
      setShowNewPostModal(false);
    }

    // Track in leafwatch
    const eventProperties = {
      publication_type: restricted ? 'token_gated' : 'public',
      publication_collect_module: collectModule.type,
      publication_reference_module: selectedReferenceModule,
      publication_reference_module_degrees_of_separation:
        selectedReferenceModule ===
        ReferenceModules.DegreesOfSeparationReferenceModule
          ? degreesOfSeparation
          : null,
      publication_has_attachments: attachments.length > 0,
      publication_attachment_types:
        attachments.length > 0
          ? attachments.map((attachment) => attachment.original.mimeType)
          : null,
      publication_has_poll: showPollEditor,
      publication_has_smol_ask: showSmolAskEditor
    };
    Leafwatch.track(
      isComment ? PUBLICATION.NEW_COMMENT : PUBLICATION.NEW_POST,
      eventProperties
    );
  };

  const onError = (error: any) => {
    setIsLoading(false);
    errorToast(error);
  };

  useUpdateEffect(() => {
    setPublicationContentError('');
  }, [audioPublication]);

  useEffectOnce(() => {
    editor.update(() => {
      $convertFromMarkdownString(publicationContent);
    });
  });

  const generateOptimisticPublication = ({
    txHash,
    txId
  }: {
    txHash?: string;
    txId?: string;
  }) => {
    return {
      id: uuid(),
      ...(isComment && { parent: publication.id }),
      type: isComment
        ? OptmisticPublicationType.NewComment
        : OptmisticPublicationType.NewPost,
      txHash,
      txId,
      content: publicationContent,
      attachments,
      title: audioPublication.title,
      cover: audioPublication.cover,
      author: audioPublication.author
    };
  };

  const { signTypedDataAsync } = useSignTypedData({
    onError
  });

  const { error, write } = useContractWrite({
    address: LENSHUB_PROXY,
    abi: LensHub,
    functionName: isComment ? 'comment' : 'post',
    onSuccess: ({ hash }) => {
      onCompleted();
      setUserSigNonce(userSigNonce + 1);
      setTxnQueue([
        generateOptimisticPublication({ txHash: hash }),
        ...txnQueue
      ]);
    },
    onError: (error) => {
      onError(error);
      setUserSigNonce(userSigNonce - 1);
    }
  });

  const [broadcastDataAvailability] = useBroadcastDataAvailabilityMutation({
    onCompleted: (data) => {
      onCompleted();
      if (data?.broadcastDataAvailability.__typename === 'RelayError') {
        return toast.error(Errors.SomethingWentWrong);
      }

      if (
        data?.broadcastDataAvailability.__typename ===
        'CreateDataAvailabilityPublicationResult'
      ) {
        push(`/posts/${data?.broadcastDataAvailability.id}`);
      }
    },
    onError
  });

  const [broadcast] = useBroadcastMutation({
    onCompleted: ({ broadcast }) => {
      onCompleted(broadcast.__typename);
      if (broadcast.__typename === 'RelayerResult') {
        setTxnQueue([
          generateOptimisticPublication({ txId: broadcast.txId }),
          ...txnQueue
        ]);
      }
    }
  });

  const [getPublication] = usePublicationLazyQuery({
    onCompleted: (data) => {
      if (data?.publication) {
        cache.modify({
          fields: {
            publications: () => {
              cache.writeQuery({
                data: { publication: data?.publication },
                query: PublicationDocument
              });
            }
          }
        });
      }
    }
  });

  const typedDataGenerator = async (
    generatedData: any,
    isDataAvailabilityPublication = false
  ) => {
    const { id, typedData } = generatedData;
    const signature = await signTypedDataAsync(getSignature(typedData));
    if (isDataAvailabilityPublication) {
      return await broadcastDataAvailability({
        variables: { request: { id, signature } }
      });
    }

    const { data } = await broadcast({
      variables: { request: { id, signature } }
    });
    if (data?.broadcast.__typename === 'RelayError') {
      return write({ args: [typedData.value] });
    }
  };

  // Normal typed data generation
  const [createCommentTypedData] = useCreateCommentTypedDataMutation({
    onCompleted: async ({ createCommentTypedData }) =>
      await typedDataGenerator(createCommentTypedData),
    onError
  });

  const [createPostTypedData] = useCreatePostTypedDataMutation({
    onCompleted: async ({ createPostTypedData }) =>
      await typedDataGenerator(createPostTypedData),
    onError
  });

  // Data availability typed data generation
  const [createDataAvailabilityPostTypedData] =
    useCreateDataAvailabilityPostTypedDataMutation({
      onCompleted: async ({ createDataAvailabilityPostTypedData }) =>
        await typedDataGenerator(createDataAvailabilityPostTypedData, true)
    });

  const [createDataAvailabilityCommentTypedData] =
    useCreateDataAvailabilityCommentTypedDataMutation({
      onCompleted: async ({ createDataAvailabilityCommentTypedData }) =>
        await typedDataGenerator(createDataAvailabilityCommentTypedData, true)
    });

  const [createCommentViaDispatcher] = useCreateCommentViaDispatcherMutation({
    onCompleted: ({ createCommentViaDispatcher }) => {
      onCompleted(createCommentViaDispatcher.__typename);
      if (createCommentViaDispatcher.__typename === 'RelayerResult') {
        setTxnQueue([
          generateOptimisticPublication({
            txId: createCommentViaDispatcher.txId
          }),
          ...txnQueue
        ]);
      }
    },
    onError
  });

  const [createPostViaDispatcher] = useCreatePostViaDispatcherMutation({
    onCompleted: ({ createPostViaDispatcher }) => {
      onCompleted(createPostViaDispatcher.__typename);
      if (createPostViaDispatcher.__typename === 'RelayerResult') {
        setTxnQueue([
          generateOptimisticPublication({ txId: createPostViaDispatcher.txId }),
          ...txnQueue
        ]);
      }
    },
    onError
  });

  const [createDataAvailabilityPostViaDispatcher] =
    useCreateDataAvailabilityPostViaDispatcherMutation({
      onCompleted: (data) => {
        if (
          data?.createDataAvailabilityPostViaDispatcher?.__typename ===
          'RelayError'
        ) {
          return;
        }

        if (
          data.createDataAvailabilityPostViaDispatcher.__typename ===
          'CreateDataAvailabilityPublicationResult'
        ) {
          onCompleted();
          const { id } = data.createDataAvailabilityPostViaDispatcher;
          push(`/posts/${id}`);
        }
      },
      onError
    });

  const [createDataAvailabilityCommentViaDispatcher] =
    useCreateDataAvailabilityCommentViaDispatcherMutation({
      onCompleted: (data) => {
        if (
          data?.createDataAvailabilityCommentViaDispatcher?.__typename ===
          'RelayError'
        ) {
          return;
        }

        if (
          data.createDataAvailabilityCommentViaDispatcher.__typename ===
          'CreateDataAvailabilityPublicationResult'
        ) {
          onCompleted();
          const { id } = data.createDataAvailabilityCommentViaDispatcher;
          getPublication({ variables: { request: { publicationId: id } } });
        }
      },
      onError
    });

  const createViaDataAvailablityDispatcher = async (request: any) => {
    const variables = { request };

    if (isComment) {
      const { data } = await createDataAvailabilityCommentViaDispatcher({
        variables
      });

      if (
        data?.createDataAvailabilityCommentViaDispatcher?.__typename ===
        'RelayError'
      ) {
        await createDataAvailabilityCommentTypedData({ variables });
      }

      return;
    }

    const { data } = await createDataAvailabilityPostViaDispatcher({
      variables
    });

    if (
      data?.createDataAvailabilityPostViaDispatcher?.__typename === 'RelayError'
    ) {
      await createDataAvailabilityPostTypedData({ variables });
    }

    return;
  };

  const createViaDispatcher = async (request: any) => {
    const variables = {
      options: { overrideSigNonce: userSigNonce },
      request
    };

    if (isComment) {
      const { data } = await createCommentViaDispatcher({
        variables: { request }
      });
      if (data?.createCommentViaDispatcher?.__typename === 'RelayError') {
        return await createCommentTypedData({ variables });
      }

      return;
    }

    const { data } = await createPostViaDispatcher({ variables: { request } });
    if (data?.createPostViaDispatcher?.__typename === 'RelayError') {
      return await createPostTypedData({ variables });
    }

    return;
  };

  const getMainContentFocus = () => {
    if (attachments.length > 0) {
      if (hasAudio) {
        return PublicationMainFocus.Audio;
      } else if (
        ALLOWED_IMAGE_TYPES.includes(attachments[0]?.original.mimeType)
      ) {
        return PublicationMainFocus.Image;
      } else if (hasVideo) {
        return PublicationMainFocus.Video;
      } else {
        return PublicationMainFocus.TextOnly;
      }
    } else {
      return PublicationMainFocus.TextOnly;
    }
  };

  const getAnimationUrl = () => {
    if (attachments.length > 0 && (hasAudio || hasVideo)) {
      return attachments[0]?.original.url;
    }

    return null;
  };

  const getAttachmentImage = () => {
    return hasAudio
      ? audioPublication.cover
      : hasVideo
      ? videoThumbnail.url
      : attachments[0]?.original.url;
  };

  const getAttachmentImageMimeType = () => {
    return hasAudio
      ? audioPublication.coverMimeType
      : attachments[0]?.original.mimeType;
  };

  const getTitlePrefix = () => {
    if (hasVideo) {
      return 'Video';
    }

    return isComment ? 'Comment' : 'Post';
  };

  const createTokenGatedMetadata = async (
    metadata: PublicationMetadataV2Input
  ) => {
    // Create the SDK instance
    const tokenGatedSdk = await LensGatedSDK.create({
      provider: publicClient as any,
      signer: walletClient as any,
      env: LIT_PROTOCOL_ENVIRONMENT as LensEnvironment
    });

    // Connect to the SDK
    await tokenGatedSdk.connect({
      address: currentProfile?.ownedBy,
      env: LIT_PROTOCOL_ENVIRONMENT as LensEnvironment
    });

    // Condition for gating the content
    const collectAccessCondition: CollectCondition = { thisPublication: true };
    const followAccessCondition: FollowCondition = {
      profileId: currentProfile?.id
    };

    // Create the access condition
    let accessCondition: AccessConditionOutput = {};
    if (collectToView && followToView) {
      accessCondition = {
        and: {
          criteria: [
            { collect: collectAccessCondition },
            { follow: followAccessCondition }
          ]
        }
      };
    } else if (collectToView) {
      accessCondition = { collect: collectAccessCondition };
    } else if (followToView) {
      accessCondition = { follow: followAccessCondition };
    }

    // Generate the encrypted metadata and upload it to Arweave
    const { contentURI } = await tokenGatedSdk.gated.encryptMetadata(
      metadata,
      currentProfile?.id,
      accessCondition,
      async (data: EncryptedMetadata) => {
        return await uploadToArweave(data);
      }
    );

    return contentURI;
  };

  const createMetadata = async (metadata: PublicationMetadataV2Input) => {
    return await uploadToArweave(metadata);
  };

  const createPublication = async () => {
    if (!currentProfile) {
      return toast.error(Errors.SignWallet);
    }

    if (handleWrongNetwork()) {
      return;
    }

    if (isComment && publication.isDataAvailability && !isSponsored) {
      return toast.error(
        t`Momoka is currently in beta - during this time certain actions are not available to all profiles.`
      );
    }

    try {
      setIsLoading(true);
      if (hasAudio) {
        setPublicationContentError('');
        const parsedData = AudioPublicationSchema.safeParse(audioPublication);
        if (!parsedData.success) {
          const issue = parsedData.error.issues[0];
          return setPublicationContentError(issue.message);
        }
      }

      if (publicationContent.length === 0 && attachments.length === 0) {
        return setPublicationContentError(
          `${isComment ? 'Comment' : 'Post'} should not be empty!`
        );
      }

      setPublicationContentError('');
      let textNftImageUrl = null;
      if (
        !attachments.length &&
        collectModule.type !== CollectModules.RevertCollectModule
      ) {
        textNftImageUrl = await getTextNftUrl(
          publicationContent,
          currentProfile.handle,
          new Date().toLocaleString()
        );
      }

      const attributes: MetadataAttributeInput[] = [
        {
          traitType: 'type',
          displayType: PublicationMetadataDisplayTypes.String,
          value: getMainContentFocus()?.toLowerCase()
        },
        ...(quotedPublication
          ? [
              {
                traitType: 'quotedPublicationId',
                displayType: PublicationMetadataDisplayTypes.String,
                value: quotedPublication.id
              }
            ]
          : []),
        ...(hasAudio
          ? [
              {
                traitType: 'author',
                displayType: PublicationMetadataDisplayTypes.String,
                value: audioPublication.author
              }
            ]
          : []),
        ...(hasVideo
          ? [
              {
                traitType: 'durationInSeconds',
                displayType: PublicationMetadataDisplayTypes.String,
                value: videoDurationInSeconds
              }
            ]
          : [])
      ];

      const attachmentsInput: PublicationMetadataMediaInput[] = attachments.map(
        (attachment) => ({
          item: attachment.original.url,
          cover: getAttachmentImage(),
          type: attachment.original.mimeType,
          altTag: attachment.original.altTag
        })
      );

      let processedPublicationContent = publicationContent;

      if (showPollEditor) {
        processedPublicationContent = await createPoll();
      }

      const metadata: PublicationMetadataV2Input = {
        version: '2.0.0',
        metadata_id: uuid(),
        content: processedPublicationContent,
        external_url: `https://lenster.xyz/u/${currentProfile?.handle}`,
        image:
          attachmentsInput.length > 0 ? getAttachmentImage() : textNftImageUrl,
        imageMimeType:
          attachmentsInput.length > 0
            ? getAttachmentImageMimeType()
            : textNftImageUrl
            ? 'image/svg+xml'
            : null,
        name: hasAudio
          ? audioPublication.title
          : `${getTitlePrefix()} by @${currentProfile?.handle}`,
        animation_url: getAnimationUrl(),
        mainContentFocus: getMainContentFocus(),
        attributes,
        media: attachmentsInput,
        locale: getUserLocale(),
        appId: APP_NAME
      };

      const isRevertCollectModule =
        collectModule.type === CollectModules.RevertCollectModule;
      const useDataAvailability = false;

      let arweaveId = null;
      if (restricted) {
        arweaveId = await createTokenGatedMetadata(metadata);
      } else {
        arweaveId = await createMetadata(metadata);
      }

      // Payload for the post/comment
      const request: CreatePublicPostRequest | CreatePublicCommentRequest = {
        profileId: currentProfile?.id,
        contentURI: `ar://${arweaveId}`,
        ...(isComment && {
          publicationId:
            publication.__typename === 'Mirror'
              ? publication?.mirrorOf?.id
              : publication?.id
        }),
        collectModule: collectModuleParams(collectModule, currentProfile),
        referenceModule:
          selectedReferenceModule ===
          ReferenceModules.FollowerOnlyReferenceModule
            ? { followerOnlyReferenceModule: onlyFollowers ? true : false }
            : {
                degreesOfSeparationReferenceModule: {
                  commentsRestricted: true,
                  mirrorsRestricted: true,
                  degreesOfSeparation
                }
              }
      };

      // Payload for the data availability post/comment
      const dataAvailablityRequest = {
        from: currentProfile?.id,
        ...(isComment && {
          commentOn:
            publication.__typename === 'Mirror'
              ? publication?.mirrorOf?.id
              : publication?.id
        }),
        contentURI: `ar://${arweaveId}`
      };

      console.log({showSmolAskEditor})
      if (showSmolAskEditor) {
        await publishIntent(smolAskConfig, currentProfile?.ownedBy);
      }

      if (canUseRelay) {
        if (useDataAvailability && isSponsored) {
          return await createViaDataAvailablityDispatcher(
            dataAvailablityRequest
          );
        }

        return await createViaDispatcher(request);
      }

      if (isComment) {
        return await createCommentTypedData({
          variables: {
            options: { overrideSigNonce: userSigNonce },
            request: request as CreatePublicCommentRequest
          }
        });
      }
      return await createPostTypedData({
        variables: { options: { overrideSigNonce: userSigNonce }, request }
      });
    } catch (error) {
      onError(error);
    }
  };

  const setGifAttachment = (gif: IGif) => {
    const attachment: NewLensterAttachment = {
      id: uuid(),
      previewItem: gif.images.original.url,
      original: {
        url: gif.images.original.url,
        mimeType: 'image/gif',
        altTag: gif.title
      }
    };
    addAttachments([attachment]);
  };

  const isSubmitDisabledByPoll = showPollEditor
    ? !pollConfig.choices.length ||
      pollConfig.choices.some((choice) => !choice.length)
    : false;

  const isSubmitDiabledBySmolAsk = showSmolAskEditor
    ? !smolAskConfig.choices.length ||
      smolAskConfig.choices.some((choice) => !choice.length)
    : false;

  const onDiscardClick = () => {
    setShowNewPostModal(false);
    setShowDiscardModal(false);
  };

  useUnmountEffect(() => {
    setPublicationContent('');
    setShowPollEditor(false);
    resetPollConfig();
    setShowSmolAskEditor(false);
    resetSmolAskConfig();
    setAttachments([]);
    setVideoThumbnail({
      url: '',
      type: '',
      uploading: false
    });
    resetCollectSettings();
    resetAccessSettings();
  });

  useEffect(() => {
    editor.setEditable(!showSmolAskEditor);
  }, [showSmolAskEditor]);

  useEffect(() => {
    if (!smolAskConfig.choices[0] || !smolAskConfig.choices[1]) {
      return;
    }
    console.log('config changed');
    const [chain, amount] = smolAskConfig.choices;
    const chainKey = chain.toLowerCase();
    if (!(chainKey in CHAIN_NAME)) {
      return;
    }
    const chainName = CHAIN_NAME[chainKey];
    editor.update(() => {
      const markdown = `🤌 Anyone wants to swap $USDC for ${amount} $MATIC on ${chainName}?`;
      $convertFromMarkdownString(markdown);
    });
  }, [smolAskConfig])

  return (
    <Card
      onClick={() => setShowEmojiPicker(false)}
      className={cn(
        { '!rounded-b-xl !rounded-t-none border-none': !isComment },
        'pb-3'
      )}
    >
      {error ? (
        <ErrorMessage
          className="!rounded-none"
          title={t`Transaction failed!`}
          error={error}
        />
      ) : null}
      <Editor />
      {publicationContentError ? (
        <div className="mt-1 px-5 pb-3 text-sm font-bold text-red-500">
          {publicationContentError}
        </div>
      ) : null}
      {showPollEditor ? <PollEditor /> : null}
      {showSmolAskEditor ? <SmolAskEditor /> : null}
      {quotedPublication ? (
        <Wrapper className="m-5" zeroPadding>
          <QuotedPublication publication={quotedPublication} isNew />
        </Wrapper>
      ) : null}
      <div className="block items-center px-5 sm:flex">
        <div className="flex items-center space-x-4">
          <Attachment />
          <EmojiPicker
            emojiClassName="text-brand"
            setShowEmojiPicker={setShowEmojiPicker}
            showEmojiPicker={showEmojiPicker}
            setEmoji={(emoji) => {
              setShowEmojiPicker(false);
              editor.update(() => {
                // @ts-ignore
                const index = editor?._editorState?._selection?.focus?.offset;
                const updatedContent =
                  publicationContent.substring(0, index) +
                  emoji +
                  publicationContent.substring(
                    index,
                    publicationContent.length
                  );
                $convertFromMarkdownString(updatedContent);
              });
            }}
          />
          <Gif setGifAttachment={(gif: IGif) => setGifAttachment(gif)} />
          {!publication?.isDataAvailability ? (
            <>
              <CollectSettings />
              <ReferenceSettings />
              <AccessSettings />
            </>
          ) : null}
          <PollSettings />
          <SmolAskSettings />
        </div>
        <div className="ml-auto pt-2 sm:pt-0">
          <Button
            disabled={
              isLoading ||
              isUploading ||
              isSubmitDisabledByPoll ||
              isSubmitDiabledBySmolAsk ||
              videoThumbnail.uploading
            }
            icon={
              isLoading ? (
                <Spinner size="xs" />
              ) : isComment ? (
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
              ) : (
                <PencilSquareIcon className="h-4 w-4" />
              )
            }
            onClick={createPublication}
          >
            {isComment ? t`Comment` : t`Post`}
          </Button>
        </div>
      </div>
      <div className="px-5">
        <Attachments attachments={attachments} isNew />
      </div>
      <Discard onDiscard={onDiscardClick} />
    </Card>
  );
};

async function publishIntent(
  smolAskConfig: {
    length: number;
    choices: string[];
  },
  address: string,
) {
  const chainKey = smolAskConfig.choices[0].toLowerCase();
  const amount = parseEther(smolAskConfig.choices[1]).toString();
  const body = JSON.stringify({
    owner: address,
    sellAmount: amount,
    sellToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    buyToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    deadline: Date.now() + smolAskConfig.length * 60 * 1000,
  });
  console.log(body);
  await fetch(`http://localhost:3000/${chainKey}/add-intent`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: body,
  })
}

export default withLexicalContext(NewPublication);
