import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useSelector } from 'react-redux';
import { IRootState } from '../../../redux/store/store';
import { Button, Container, Grid, Typography } from '@mui/material';
import collectionExample from '../../../assets/data/collectionExample.json';
import { IJsonCollection, Nft } from '../../../interfaces/marketplaceInterfaces';
import { mainTheme } from '../../../common/mainTheme';

export const MintScreen = () => {
  const { nftContract, marketplaceContract, enqueueSnackbar } = useSelector((state: IRootState) => state.market);

  const [nfts, setNfts] = useState<Nft[]>([]);
  const [beginMint, setBeginMint] = useState(false);
  const [jsonCollectionStr, setJsonCollectionStr] = useState('');
  const [collectionOwner, setCollectionOwner] = useState('');
  const [ownerEarnsPercentagePerTransaction, setOwnerEarnsPercentagePerTransaction] = useState(0);
  const [totalNftsJson, setTotalNftsJson] = useState(0);

  function onReaderLoad(event: any) {
    setJsonCollectionStr(event.target.result);
  }

  useEffect(() => {
    const loadUris = async () => {
      if (jsonCollectionStr) {
        const jsonCollection: IJsonCollection = JSON.parse(jsonCollectionStr);

        setCollectionOwner(jsonCollection.collectionOwner);
        setOwnerEarnsPercentagePerTransaction(jsonCollection.ownerEarnsPercentagePerTransaction);
        setTotalNftsJson(jsonCollection.nfts.length);

        const newJson = jsonCollection.nfts.map((nft) => {
          return {
            tokenURI: nft.tokenURI,
            price: ethers.utils.parseEther(nft.price.toString())
          };
        });
        setNfts(newJson);
      }
    };

    const beginProcess = async () => {
      setBeginMint(true);
      await loadUris();
    };

    if (jsonCollectionStr) {
      beginProcess();
    }
  }, [jsonCollectionStr]);

  const preMint = async (event: any) => {
    event.preventDefault();
    const file = event.target.files[0];
    if (typeof file !== 'undefined') {
      try {
        const reader = new FileReader();
        reader.onload = onReaderLoad;
        reader.readAsText(event.target.files[0]);
      } catch (error) {
        console.log('ipfs uri upload error: ', error);
      }
    }
  };

  const finalMint = async () => {
    try {
      // Approve transaction needed
      await (await nftContract.setApprovalForAll(marketplaceContract.address, true)).wait();

      await (
        await marketplaceContract.mintCollection(
          nfts,
          collectionOwner || '0x0',
          ownerEarnsPercentagePerTransaction || 0
        )
      ).wait();

      setBeginMint(false);

      console.log('minted!');
      if (enqueueSnackbar) {
        enqueueSnackbar('The transaction has been sent', { variant: 'info' });
      }
    } catch (error) {
      setBeginMint(false);
      console.log(error);
    }
  };

  useEffect(() => {
    if (beginMint && nfts.length > 0 && nfts.length === totalNftsJson) {
      finalMint();
      setBeginMint(false);
    }
  }, [nfts]);

  return (
    <>
      <Container
        maxWidth="xl"
        sx={{ paddingTop: 4 }}
        style={{
          background: `linear-gradient(to right bottom, ${mainTheme.fourthColor}, ${mainTheme.secondaryColor})`
        }}
      >
        <Grid display="flex" justifyContent="center" sx={{ pb: 2 }}>
          <Grid>
            <Typography color={mainTheme.textColor} variant="subtitle1" textAlign="center">
              Mint
            </Typography>
            <Typography color={mainTheme.textColor} variant="h2">
              Minting Collection
            </Typography>
          </Grid>
        </Grid>
      </Container>
      <Grid container sx={{ pt: 0, pb: 2, background: mainTheme.primaryColor }}>
        <Container>
          <Typography variant="h6" sx={{ marginTop: 4 }}>
            JSON File Example
          </Typography>
          <Typography variant="caption">
            <pre>{JSON.stringify(collectionExample, null, 2)}</pre>
          </Typography>
        </Container>
      </Grid>
      <Container maxWidth="xl">
        <Grid display="flex" justifyContent="center">
          <Button variant="outlined" component="label" onChange={preMint} sx={{ marginTop: 5, marginBottom: 5 }}>
            Mint Collection from JSON
            <input type="file" accept="application/json" hidden />
          </Button>
        </Grid>
      </Container>
    </>
  );
};
