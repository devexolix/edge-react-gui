// @flow

import * as React from 'react'
import { Image, View } from 'react-native'

import { logoutRequest } from '../../actions/LoginActions.js'
import { selectWalletFromModal } from '../../actions/WalletActions.js'
import edgeLogo from '../../assets/images/edgeLogo/Edge_logo_S.png'
import { type RootState } from '../../reducers/RootReducer.js'
import { useEffect, useState } from '../../types/reactHooks'
import { reduxShallowEqual, useDispatch, useSelector } from '../../types/reactRedux'
import { SceneWrapper } from '../common/SceneWrapper.js'
import { type Theme, cacheStyles, useTheme } from '../services/ThemeContext'
import { AccountList } from '../themed/AccountList'
import { PanelCurrency } from '../themed/ControlPanel/PanelCurrency.js'
import { PanelList } from '../themed/ControlPanel/PanelList.js'
import { DividerLine } from '../themed/DividerLine'
import { Fade } from '../themed/Fade'

export type StateProps = {
  selectedCurrencyCode: string,
  selectedWalletId: string
}

const selector = (state: RootState) => ({
  selectedWalletId: state.ui.wallets.selectedWalletId,
  selectedCurrencyCode: state.ui.wallets.selectedCurrencyCode
})

type Props = { navigation: { state: { isDrawerOpen: boolean } } }

export default function ControlPanel({
  navigation: {
    state: { isDrawerOpen }
  }
}: Props) {
  const [isViewUserList, setIsViewUserList] = useState(false)

  useEffect(() => {
    if (!isDrawerOpen) setIsViewUserList(false)
  }, [isDrawerOpen])

  const dispatch = useDispatch()

  const theme = useTheme()
  const styles = getStyles(theme)

  const { selectedCurrencyCode, selectedWalletId }: StateProps = useSelector(selector, reduxShallowEqual)

  if (!selectedWalletId) return null

  const onLogout = () => dispatch(logoutRequest())
  const onSelectWallet = (walletId: string, currencyCode: string) => dispatch(selectWalletFromModal(selectedWalletId, selectedCurrencyCode))

  return (
    <SceneWrapper hasHeader={false} hasTabs={false} isGapTop={false} background="none">
      <View style={styles.panel}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image style={styles.logoImage} source={edgeLogo} resizeMode="contain" />
          </View>
          <PanelCurrency />
          <AccountList onToggle={() => setIsViewUserList(!isViewUserList)} />
        </View>
        <Fade visible={isViewUserList} fadeInOpacity={0.8} style={styles.disable} />
        <PanelList onSelectWallet={onSelectWallet} onLogout={onLogout} />
        <DividerLine marginRem={[1, -2, 2, 0]} />
      </View>
    </SceneWrapper>
  )
}

const getStyles = cacheStyles((theme: Theme) => ({
  panel: {
    flex: 1,
    backgroundColor: theme.modal,
    position: 'relative',
    paddingLeft: theme.rem(1.2),
    paddingRight: theme.rem(2),
    paddingTop: theme.rem(13),
    borderBottomLeftRadius: theme.rem(2),
    borderTopLeftRadius: theme.rem(2)
  },
  header: {
    borderBottomRightRadius: theme.rem(2),
    borderBottomLeftRadius: theme.rem(2),
    paddingLeft: theme.rem(1.2),
    paddingRight: theme.rem(2),
    borderTopLeftRadius: theme.rem(2),
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: theme.modal,
    zIndex: 2
  },
  disable: {
    backgroundColor: theme.fadeDisable,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: theme.rem(2),
    borderBottomLeftRadius: theme.rem(2)
  },
  logo: {
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.rem(2),
    marginLeft: theme.rem(0.8)
  },
  logoImage: {
    height: theme.rem(2.5),
    marginTop: theme.rem(0.5),
    marginRight: theme.rem(0.25)
  }
}))
