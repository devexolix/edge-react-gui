// @flow

import { bns } from 'biggystring'
import { asMaybeNoAmountSpecifiedError } from 'edge-core-js'
import * as React from 'react'
import { TouchableWithoutFeedback, View } from 'react-native'
import { type AirshipBridge } from 'react-native-airship'
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome'
import { sprintf } from 'sprintf-js'

import { updateMaxSpend, updateTransactionAmount } from '../../actions/SendConfirmationActions.js'
import s from '../../locales/strings.js'
import { getDisplayDenomination, getExchangeDenomination } from '../../selectors/DenominationSelectors.js'
import { convertCurrencyFromExchangeRates, convertNativeToExchangeRateDenomination, getExchangeRate } from '../../selectors/WalletSelectors.js'
import { connect } from '../../types/reactRedux.js'
import type { GuiCurrencyInfo } from '../../types/types.js'
import { convertTransactionFeeToDisplayFee, DECIMAL_PRECISION, getDenomFromIsoCode } from '../../util/utils.js'
import { ExchangeRate } from '../common/ExchangeRate.js'
import { type Theme, type ThemeProps, cacheStyles, withTheme } from '../services/ThemeContext.js'
import { Card } from '../themed/Card'
import { EdgeText } from '../themed/EdgeText.js'
import { type ExchangedFlipInputAmounts, ExchangedFlipInput } from '../themed/ExchangedFlipInput'
import { MiniButton } from '../themed/MiniButton.js'
import { ThemedModal } from '../themed/ThemedModal.js'

type OwnProps = {
  bridge: AirshipBridge<void>,
  walletId: string,
  currencyCode: string,
  onFeesChange: () => void
}

type StateProps = {
  // Balance
  balanceCrypto: string,
  balanceFiat: string,

  // FlipInput
  flipInputHeaderText: string,
  flipInputHeaderLogo: string,
  primaryInfo: GuiCurrencyInfo,
  secondaryInfo: GuiCurrencyInfo,
  fiatPerCrypto: string,
  overridePrimaryExchangeAmount: string,
  forceUpdateGuiCounter: number,

  // Fees
  feeSyntax: string,
  feeSyntaxStyle?: string,

  // Error
  errorMessage?: string
}

type DispatchProps = {
  updateMaxSpend: (walletId: string, currencyCode: string) => void,
  updateTransactionAmount: (nativeAmount: string, exchangeAmount: string, walletId: string, currencyCode: string) => void
}

type State = {
  overridePrimaryExchangeAmount: string,
  forceUpdateGuiCounter: number,
  errorMessage?: string
}

type Props = OwnProps & StateProps & DispatchProps & ThemeProps

class FlipInputModalComponent extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      overridePrimaryExchangeAmount: props.overridePrimaryExchangeAmount,
      forceUpdateGuiCounter: 0
    }
  }

  handleCloseModal = () => this.props.bridge.resolve()

  handleFeesChange = () => {
    this.handleCloseModal()
    this.props.onFeesChange()
  }

  handleExchangeAmountChange = ({ nativeAmount, exchangeAmount }: ExchangedFlipInputAmounts) => {
    const { walletId, currencyCode, updateTransactionAmount } = this.props
    updateTransactionAmount(nativeAmount, exchangeAmount, walletId, currencyCode)
  }

  handleAmountChangeError = (errorMessage?: string) => this.setState({ errorMessage })

  componentDidUpdate(prevProps: Props) {
    if (this.props.forceUpdateGuiCounter !== this.state.forceUpdateGuiCounter) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        overridePrimaryExchangeAmount: this.props.overridePrimaryExchangeAmount,
        forceUpdateGuiCounter: this.props.forceUpdateGuiCounter
      })
    }
  }

  handleSendMaxAmount = () => this.props.updateMaxSpend(this.props.walletId, this.props.currencyCode)

  renderErrorMessge = () => {
    const { errorMessage = this.state.errorMessage, theme } = this.props
    const styles = getStyles(theme)

    return errorMessage != null ? (
      <EdgeText numberOfLines={1} style={styles.exchangeRateErrorText}>
        {errorMessage.split('\n')[0]}
      </EdgeText>
    ) : null
  }

  renderExchangeRates = () => {
    const { primaryInfo, secondaryInfo, fiatPerCrypto, theme } = this.props
    const styles = getStyles(theme)

    return (
      <View style={styles.exchangeRateContainer}>
        <EdgeText style={styles.exchangeRateDescriptionText}>{s.strings.string_rate}</EdgeText>
        <ExchangeRate primaryInfo={primaryInfo} secondaryInfo={secondaryInfo} secondaryDisplayAmount={fiatPerCrypto} style={styles.exchangeRateText} />
      </View>
    )
  }

  renderBalance = () => {
    const { balanceCrypto, balanceFiat, theme } = this.props
    const styles = getStyles(theme)
    const balance = `${balanceCrypto} (${balanceFiat})`
    return (
      <View style={styles.balanceContainer}>
        <EdgeText style={styles.balanceString}>{s.strings.send_confirmation_balance}</EdgeText>
        <EdgeText style={styles.balanceValue}>{balance}</EdgeText>
      </View>
    )
  }

  renderFlipInput = () => {
    const { flipInputHeaderText, flipInputHeaderLogo, primaryInfo, secondaryInfo, fiatPerCrypto } = this.props
    const { overridePrimaryExchangeAmount } = this.state
    return (
      <Card marginRem={0}>
        <ExchangedFlipInput
          headerText={flipInputHeaderText}
          headerLogo={flipInputHeaderLogo}
          primaryCurrencyInfo={{ ...primaryInfo }}
          secondaryCurrencyInfo={{ ...secondaryInfo }}
          exchangeSecondaryToPrimaryRatio={fiatPerCrypto}
          overridePrimaryExchangeAmount={overridePrimaryExchangeAmount}
          forceUpdateGuiCounter={0}
          onExchangeAmountChanged={this.handleExchangeAmountChange}
          onError={this.handleAmountChangeError}
          onNext={this.handleCloseModal}
          keyboardVisible={false}
          isFocus
          isFiatOnTop={bns.eq(overridePrimaryExchangeAmount, '0')}
        />
        <MiniButton alignSelf="center" label={s.strings.string_max_cap} marginRem={[1.2, 0, 0]} onPress={this.handleSendMaxAmount} />
      </Card>
    )
  }

  renderFees = () => {
    const { feeSyntax, feeSyntaxStyle, theme } = this.props
    const styles = getStyles(theme)
    const feeStyle =
      feeSyntaxStyle === 'dangerText' ? styles.feesSyntaxDanger : feeSyntaxStyle === 'warningText' ? styles.feesSyntaxWarning : styles.feesSyntaxDefault
    return (
      <View style={styles.feesContainer}>
        <View style={styles.feesDescriptionContainer}>
          <EdgeText style={styles.feesContainerText}>{s.strings.string_fee}</EdgeText>
          <FontAwesomeIcon name="edit" style={styles.feeIcon} size={theme.rem(0.75)} />
        </View>
        <EdgeText style={feeStyle}>{feeSyntax}</EdgeText>
      </View>
    )
  }

  render() {
    return (
      <ThemedModal bridge={this.props.bridge} onCancel={this.handleCloseModal} paddingRem={1.5}>
        {this.renderFlipInput()}
        <TouchableWithoutFeedback onPress={this.handleFeesChange}>
          <View>
            {this.renderFees()}
            {this.renderExchangeRates()}
            {this.renderBalance()}
            {this.renderErrorMessge()}
          </View>
        </TouchableWithoutFeedback>
      </ThemedModal>
    )
  }
}

const getStyles = cacheStyles((theme: Theme) => ({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerMaxAmountText: {
    color: theme.textLink
  },
  balanceContainer: {
    flexDirection: 'row'
  },
  exchangeRateContainer: {
    flexDirection: 'row'
  },
  exchangeRateErrorText: {
    fontSize: theme.rem(0.75),
    color: theme.dangerText
  },
  exchangeRateDescriptionText: {
    flex: 1,
    fontSize: theme.rem(0.75),
    color: theme.secondaryText
  },
  exchangeRateText: {
    fontSize: theme.rem(0.75)
  },
  balanceValue: {
    fontSize: theme.rem(0.75)
  },
  balanceString: {
    flex: 1,
    fontSize: theme.rem(0.75),
    color: theme.secondaryText
  },
  feesContainer: {
    flexDirection: 'row',
    marginTop: theme.rem(0.5),
    marginBottom: theme.rem(1)
  },
  feesDescriptionContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  feesContainerText: {
    color: theme.secondaryText
  },
  feesSyntaxDefault: {
    color: theme.primaryText
  },
  feesSyntaxWarning: {
    color: theme.warningText
  },
  feesSyntaxDanger: {
    color: theme.dangerText
  },
  feeIcon: {
    color: theme.iconTappable,
    marginLeft: theme.rem(0.5)
  },
  spacer: {
    flex: 1
  }
}))

export const FlipInputModal = connect<StateProps, DispatchProps, OwnProps>(
  (state, ownProps) => {
    const { walletId, currencyCode } = ownProps
    const guiWallet = state.ui.wallets.byId[walletId]
    const { fiatCurrencyCode, isoFiatCurrencyCode } = guiWallet

    // Denominations
    const cryptoDenomination = getDisplayDenomination(state, currencyCode)
    const cryptoExchangeDenomination = getExchangeDenomination(state, currencyCode)
    const fiatDenomination = getDenomFromIsoCode(fiatCurrencyCode)

    // Balances
    const balanceInCrypto = guiWallet.nativeBalances[currencyCode]
    const balanceCrypto = convertNativeToExchangeRateDenomination(state.ui.settings, currencyCode, balanceInCrypto)
    const balanceFiat = convertCurrencyFromExchangeRates(state.exchangeRates, currencyCode, isoFiatCurrencyCode, balanceCrypto)

    // FlipInput
    const fiatPerCrypto = getExchangeRate(state, currencyCode, isoFiatCurrencyCode)

    const primaryInfo = {
      displayCurrencyCode: currencyCode,
      displayDenomination: cryptoDenomination,
      exchangeCurrencyCode: cryptoExchangeDenomination.name,
      exchangeDenomination: cryptoExchangeDenomination
    }

    const secondaryInfo = {
      displayCurrencyCode: fiatCurrencyCode,
      displayDenomination: fiatDenomination,
      exchangeCurrencyCode: isoFiatCurrencyCode,
      exchangeDenomination: fiatDenomination
    }

    const { forceUpdateGuiCounter, nativeAmount } = state.ui.scenes.sendConfirmation
    const overridePrimaryExchangeAmount = bns.div(nativeAmount, primaryInfo.exchangeDenomination.multiplier, DECIMAL_PRECISION)

    // Fees
    const transactionFee = convertTransactionFeeToDisplayFee(
      guiWallet,
      currencyCode,
      state.exchangeRates,
      state.ui.scenes.sendConfirmation.transaction,
      state.ui.settings
    )
    const feeSyntax = `${transactionFee.cryptoAmount} ${currencyCode} (${transactionFee.fiatSymbol || ''} ${transactionFee.fiatAmount})`
    const feeSyntaxStyle = transactionFee.fiatStyle

    // Error
    const error = state.ui.scenes.sendConfirmation.error
    let errorMessage
    if (error && error.message !== 'broadcastError' && error.message !== 'transactionCancelled' && asMaybeNoAmountSpecifiedError(error) == null) {
      errorMessage = error.message
    }

    return {
      // Balances
      balanceCrypto: `${balanceCrypto} ${currencyCode}`,
      balanceFiat: `${fiatDenomination.symbol ? fiatDenomination.symbol + ' ' : ''} ${bns.toFixed(balanceFiat, 2, 2)}`,

      // FlipInput
      flipInputHeaderText: sprintf(s.strings.send_from_wallet, guiWallet.name),
      flipInputHeaderLogo: guiWallet.symbolImageDarkMono || '',
      primaryInfo,
      secondaryInfo,
      fiatPerCrypto: fiatPerCrypto ?? '0',
      overridePrimaryExchangeAmount,
      forceUpdateGuiCounter,

      // Fees
      feeSyntax,
      feeSyntaxStyle,

      // Error
      errorMessage
    }
  },
  dispatch => ({
    updateMaxSpend(walletId: string, currencyCode: string) {
      dispatch(updateMaxSpend(walletId, currencyCode))
    },
    updateTransactionAmount(nativeAmount: string, exchangeAmount: string, walletId: string, currencyCode: string) {
      dispatch(updateTransactionAmount(nativeAmount, exchangeAmount, walletId, currencyCode))
    }
  })
)(withTheme(FlipInputModalComponent))
