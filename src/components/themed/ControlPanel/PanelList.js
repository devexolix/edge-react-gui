// @flow

import * as React from 'react'
import { Platform, ScrollView, TouchableOpacity, View } from 'react-native'
import Share from 'react-native-share'
import { sprintf } from 'sprintf-js'

import { Fontello } from '../../../assets/vector/index.js'
import { Airship } from '../../../components/services/AirshipInstance.js'
import { FIO_ADDRESS_LIST, FIO_REQUEST_LIST, SCAN, SETTINGS_OVERVIEW_TAB, TERMS_OF_SERVICE } from '../../../constants/SceneKeys'
import { getPrivateKeySweepableCurrencies } from '../../../constants/WalletAndCurrencyConstants.js'
import s from '../../../locales/strings.js'
import { THEME } from '../../../theme/variables/airbitz.js'
import { type ParamList, Actions } from '../../../types/routerTypes.js'
import { type WalletListResult, WalletListModal } from '../../modals/WalletListModal.js'
import { SWEEP_PRIVATE_KEY } from '../../scenes/ScanScene'
import { type Theme, cacheStyles, useTheme } from '../../services/ThemeContext.js'
import { EdgeText } from '../EdgeText'

export type Props = {
  onLogout: (username?: string) => void,
  onSelectWallet: (walletId: string, currencyCode: string) => void
}

type RowProps = {
  title: string,
  route?: $Keys<ParamList>,
  onPress?: () => void,
  iconName: string
}

export function PanelList(props: Props) {
  const { onSelectWallet, onLogout } = props

  const onSweep = () => {
    Airship.show(bridge => (
      <WalletListModal bridge={bridge} headerTitle={s.strings.select_wallet} allowedCurrencyCodes={getPrivateKeySweepableCurrencies()} showCreateWallet />
    )).then(({ walletId, currencyCode }: WalletListResult) => {
      if (walletId && currencyCode) {
        onSelectWallet(walletId, currencyCode)
        Actions.jump(SCAN, {
          data: SWEEP_PRIVATE_KEY
        })
      }
    })
  }

  const onShareApp = () => {
    const url = THEME.websiteUrl
    const message = `${sprintf(s.strings.share_subject, s.strings.app_name)}\n\n${s.strings.share_message}\n\n`

    const shareOptions = {
      message: Platform.OS === 'ios' ? message : message + url,
      url: Platform.OS === 'ios' ? url : ''
    }

    Share.open(shareOptions).catch(e => console.log(e))
  }

  function PanelRow(props: RowProps) {
    const theme = useTheme()
    const styles = getStyles(theme)

    const { route, title, onPress, iconName } = props

    const goToScene = (scene: $Keys<ParamList>, sceneProps: any) => {
      const { currentScene, drawerClose } = Actions

      if (currentScene !== scene) {
        Actions.jump(scene, sceneProps)
      } else if (sceneProps) {
        Actions.refresh(sceneProps)
      }

      drawerClose()
    }

    const onPressHandler = () => {
      if (route) goToScene(route)
      if (onPress) onPress()
    }

    return (
      <TouchableOpacity onPress={onPressHandler}>
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Fontello name={iconName} size={theme.rem(1.5)} color={theme.controlPanelIcon} />
          </View>
          <View>
            <EdgeText style={styles.text}>{title}</EdgeText>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const getStyles = cacheStyles((theme: Theme) => ({
    iconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.rem(1.5),
      height: theme.rem(2),
      width: theme.rem(1.5)
    },
    row: {
      color: 'white',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      height: theme.rem(2.75),
      paddingRight: theme.rem(2.5)
    },
    text: {
      fontFamily: theme.fontFaceBold
    },
    iconSize: {
      width: theme.rem(2),
      height: theme.rem(2)
    },
    touchableCheckboxInterior: {
      justifyContent: 'center',
      alignItems: 'center'
    }
  }))

  const rowDatas: RowProps[] = [
    { title: s.strings.drawer_fio_names, route: FIO_ADDRESS_LIST, iconName: 'fionames' },
    { title: s.strings.drawer_fio_requests, route: FIO_REQUEST_LIST, iconName: 'FIO-geometric' },
    { title: s.strings.drawer_scan_qr_send, route: SCAN, iconName: 'scanqr' },
    { title: s.strings.drawer_sweep_private_key, onPress: onSweep, iconName: 'groupsweep' },
    { title: s.strings.title_terms_of_service, route: TERMS_OF_SERVICE, iconName: 'tos' },
    { title: s.strings.string_share + ' ' + s.strings.app_name, onPress: onShareApp, iconName: 'share' },
    { title: s.strings.settings_title, route: SETTINGS_OVERVIEW_TAB, iconName: 'settings' },
    { title: s.strings.settings_button_logout, onPress: onLogout, iconName: 'logout' }
  ]

  const rows = []
  for (const rowData of rowDatas) {
    rows.push(<PanelRow title={rowData.title} route={rowData.route} onPress={rowData.onPress} iconName={rowData.iconName} />)
  }

  return <ScrollView>{rows}</ScrollView>
}
