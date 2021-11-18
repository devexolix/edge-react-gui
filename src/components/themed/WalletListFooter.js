// @flow

import { type EdgeAccount } from 'edge-core-js'
import * as React from 'react'
import { Alert, TouchableOpacity, View } from 'react-native'
import Ionicon from 'react-native-vector-icons/Ionicons'

import { CREATE_WALLET_SELECT_CRYPTO, CREATE_WALLET_SELECT_FIAT, MANAGE_TOKENS } from '../../constants/SceneKeys.js'
import { getSpecialCurrencyInfo, getTokenCurrencies } from '../../constants/WalletAndCurrencyConstants.js'
import s from '../../locales/strings.js'
import { connect } from '../../types/reactRedux.js'
import { Actions } from '../../types/routerTypes.js'
import { type GuiWallet } from '../../types/types.js'
import { makeCreateWalletType } from '../../util/CurrencyInfoHelpers.js'
import { ButtonsModal } from '../modals/ButtonsModal.js'
import { type WalletListResult, WalletListModal } from '../modals/WalletListModal.js'
import { Airship } from '../services/AirshipInstance.js'
import { type Theme, type ThemeProps, cacheStyles, withTheme } from '../services/ThemeContext.js'
import { EdgeText } from './EdgeText.js'

type StateProps = {
  account: EdgeAccount,
  wallets: { [walletId: string]: GuiWallet }
}

class WalletListFooterComponent extends React.PureComponent<StateProps & ThemeProps> {
  renderAddButton = (title: string, onPress: () => void) => {
    const { theme } = this.props
    const styles = getStyles(theme)
    return (
      <View style={styles.addButtonsContainer}>
        <TouchableOpacity onPress={onPress}>
          <View style={styles.addButtonsInnerContainer}>
            <Ionicon name="md-add" style={styles.addItem} size={theme.rem(1.5)} color={theme.iconTappable} />
            <EdgeText style={[styles.addItem, styles.addItemText]}>{title}</EdgeText>
          </View>
        </TouchableOpacity>
      </View>
    )
  }

  render() {
    const { theme } = this.props
    const styles = getStyles(theme)
    return (
      <View style={styles.container}>
        {this.renderAddButton(s.strings.wallet_list_add_wallet, () => Actions.push(CREATE_WALLET_SELECT_CRYPTO))}
        {this.renderAddButton(s.strings.wallet_list_add_token, this.addToken)}
      </View>
    )
  }

  addToken = () => {
    const { account, wallets } = this.props

    // check for existence of any token-enabled wallets
    let walletCount: number = 0
    let guiWallet: GuiWallet

    for (const key of Object.keys(wallets)) {
      const wallet = wallets[key]
      const specialCurrencyInfo = getSpecialCurrencyInfo(wallet.currencyCode)
      if (specialCurrencyInfo.isCustomTokensSupported) {
        guiWallet = wallet
        walletCount++
      }
    }

    if (walletCount === 1 && guiWallet) {
      return Actions.push(MANAGE_TOKENS, { guiWallet })
    }

    if (walletCount > 1) {
      Airship.show(bridge => <WalletListModal bridge={bridge} headerTitle={s.strings.select_wallet} allowedCurrencyCodes={getTokenCurrencies()} />).then(
        ({ walletId, currencyCode }: WalletListResult) => {
          if (walletId && currencyCode) {
            Actions.push(MANAGE_TOKENS, { guiWallet: wallets[walletId] })
          }
        }
      )
      return
    }

    // if no token-enabled wallets then allow creation of token-enabled wallet
    const { ethereum } = account.currencyConfig
    if (ethereum == null) {
      return Alert.alert(s.strings.create_wallet_invalid_input, s.strings.create_wallet_select_valid_crypto)
    }

    Airship.show(bridge => (
      <ButtonsModal
        bridge={bridge}
        title={s.strings.wallet_list_add_token_modal_title}
        message={s.strings.wallet_list_add_token_modal_message}
        buttons={{
          confirm: { label: s.strings.title_create_wallet },
          cancel: { label: s.strings.string_cancel_cap, type: 'secondary' }
        }}
      />
    ))
      .then(answer => {
        if (answer === 'confirm') {
          Actions.push(CREATE_WALLET_SELECT_FIAT, {
            selectedWalletType: makeCreateWalletType(ethereum.currencyInfo)
          })
        }
      })
      .catch(error => {
        console.log(error)
      })
  }
}

const getStyles = cacheStyles((theme: Theme) => ({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    marginVertical: theme.rem(1),
    paddingTop: theme.rem(0.75),
    marginLeft: theme.rem(1),
    paddingRight: theme.rem(1),
    borderTopWidth: theme.thinLineWidth,
    borderTopColor: theme.lineDivider
  },
  addButtonsContainer: {
    flex: 1
  },
  addButtonsInnerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.tileBackground,
    height: theme.rem(3.25)
  },
  addItem: {
    margin: theme.rem(0.25),
    color: theme.textLink,
    fontFamily: theme.fontFaceMedium
  },
  addItemText: {
    flexShrink: 1
  },
  buyCryptoContainer: {
    backgroundColor: theme.tileBackground,
    height: theme.rem(5.5),
    justifyContent: 'center',
    alignItems: 'center'
  },
  buyCryptoImagesContainer: {
    flexDirection: 'row'
  },
  buyCryptoImages: {
    width: theme.rem(1.75),
    height: theme.rem(1.75),
    margin: theme.rem(0.25)
  },
  buyCryptoText: {
    fontFamily: theme.fontFaceMedium,
    color: theme.textLink
  }
}))

export const WalletListFooter = connect<StateProps, {}, {}>(
  state => ({
    account: state.core.account,
    wallets: state.ui.wallets.byId
  }),
  dispatch => ({})
)(withTheme(WalletListFooterComponent))
