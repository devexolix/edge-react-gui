// @flow

import { type EdgeUserInfo } from 'edge-core-js'
import * as React from 'react'
import { Image, Pressable, ScrollView, TouchableHighlight, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import Feather from 'react-native-vector-icons/Feather'
import MaterialIcon from 'react-native-vector-icons/MaterialIcons'
import { sprintf } from 'sprintf-js'

import { deleteLocalAccount } from '../../actions/AccountActions.js'
import { logoutRequest } from '../../actions/LoginActions.js'
import edgeLogo from '../../assets/images/edgeLogo/Edge_logo_S.png'
import { Fontello } from '../../assets/vector'
import s from '../../locales/strings'
import { useEffect, useState } from '../../types/reactHooks'
import { useDispatch, useSelector } from '../../types/reactRedux'
import { SceneWrapper } from '../common/SceneWrapper.js'
import { ButtonsModal } from '../modals/ButtonsModal.js'
import { Airship } from '../services/AirshipInstance.js'
import { type Theme, cacheStyles, useTheme } from '../services/ThemeContext'
import { PanelCurrency } from '../themed/ControlPanel/PanelCurrency.js'
import { PanelList } from '../themed/ControlPanel/PanelList.js'
import { DividerLine } from '../themed/DividerLine'
import { EdgeText } from '../themed/EdgeText'

type Props = { navigation: { state: { isDrawerOpen: boolean } } }

export default function ControlPanel(props: Props) {
  const { isDrawerOpen } = props.navigation.state
  const dispatch = useDispatch()
  const theme = useTheme()
  const styles = getStyles(theme)

  // Redux state:
  const activeUsername = useSelector(state => state.core.account.username)
  const context = useSelector(state => state.core.context)

  /// ---- local state ----

  // Maintain the list of usernames:
  const [usernames, setUsernames] = useState(() => arrangeUsers(context.localUsers, activeUsername))
  useEffect(() => context.watch('localUsers', localUsers => setUsernames(arrangeUsers(context.localUsers, activeUsername))), [context, activeUsername])

  // User list dopdown state:
  const [isDropped, setIsDropped] = useState(false)
  const handleToggleAccountDropdown = () => {
    setIsDropped(!isDropped)
  }
  useEffect(() => {
    if (!isDrawerOpen) setIsDropped(false)
  }, [isDrawerOpen])

  /// ---- callbacks ----

  // AccountList Fns
  const handleDeleteAccount = (username: string) => {
    Airship.show(bridge => (
      <ButtonsModal
        bridge={bridge}
        title={s.strings.delete_account_header}
        message={sprintf(s.strings.delete_username_account, username)}
        buttons={{
          ok: {
            label: s.strings.string_delete,
            async onPress() {
              await dispatch(deleteLocalAccount(username))
              return true
            }
          },
          cancel: { label: s.strings.string_cancel }
        }}
      />
    ))
  }

  const handleSwitchAccount = (username: string) => {
    dispatch(logoutRequest(username))
  }

  /// ---- animations ----

  // Track the height of the dropdown:
  const userListHeight = styles.row.height * usernames.length + theme.rem(1)
  const heightAnimation = useSharedValue(userListHeight)
  useEffect(() => {
    heightAnimation.value = withTiming(userListHeight)
  }, [heightAnimation, userListHeight])

  // User list dropdown animation:
  const dropAnimation = useSharedValue(0)
  useEffect(() => {
    dropAnimation.value = withTiming(isDropped ? 1 : 0, {
      duration: 700,
      easing: Easing.inOut(Easing.cubic)
    })
  }, [dropAnimation, isDropped])

  /// ---- dynamic css ----

  const dropdownAnimatedStyle = useAnimatedStyle(() => ({
    height: heightAnimation.value * dropAnimation.value
  }))
  const fadeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 0.8 * dropAnimation.value
  }))
  const flipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${(isDropped ? -180 : 180) * dropAnimation.value}deg` }]
  }))

  return (
    <SceneWrapper hasHeader={false} hasTabs={false} isGapTop={false} background="none">
      <View style={styles.panel}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image style={styles.logoImage} source={edgeLogo} resizeMode="contain" />
          </View>
          <PanelCurrency />
          <View>
            <Pressable onPress={handleToggleAccountDropdown}>
              <View style={styles.dropdownHeader}>
                <Fontello name="account" style={styles.iconUser} size={theme.rem(1.5)} color={theme.controlPanelIcon} />
                <EdgeText style={styles.text}>{activeUsername}</EdgeText>
                <Animated.View style={flipAnimatedStyle}>
                  <Feather name="chevron-down" color={theme.controlPanelIcon} size={theme.rem(1.5)} />
                </Animated.View>
              </View>
            </Pressable>
            <DividerLine marginRem={[1, -2, 0, 0]} />
            <Animated.View style={[styles.root, dropdownAnimatedStyle]}>
              <ScrollView>
                {usernames.map((username: string) => (
                  <View key={username} style={styles.row}>
                    <TouchableHighlight onPress={() => handleSwitchAccount(username)}>
                      <EdgeText style={styles.text}>{username}</EdgeText>
                    </TouchableHighlight>
                    <TouchableHighlight onPress={() => handleDeleteAccount(username)}>
                      <View>
                        <MaterialIcon size={theme.rem(1.5)} name="close" color={theme.controlPanelIcon} />
                      </View>
                    </TouchableHighlight>
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          </View>
        </View>
        <PanelList />
        <DividerLine marginRem={[1, -2, 2, 0]} />
        <Animated.View style={[styles.disable, fadeAnimatedStyle]} pointerEvents="none" />
        {!isDropped ? null : <Pressable style={styles.invisibleTapper} onPress={handleToggleAccountDropdown} />}
      </View>
    </SceneWrapper>
  )
}

/**
 * Given a list of users from the core,
 * remove the given user, then organize the 3 most recent users,
 * followed by the rest in alphabetical order.
 */
function arrangeUsers(localUsers: EdgeUserInfo[], activeUsername: string): string[] {
  // Sort the users according to their last login date:
  const usernames = localUsers
    .filter(info => info.username !== activeUsername)
    .sort((a, b) => {
      const { lastLogin: aDate = new Date(0) } = a
      const { lastLogin: bDate = new Date(0) } = b
      return aDate.valueOf() - bDate.valueOf()
    })
    .map(info => info.username)

  // Sort everything after the last 3 entries alphabetically:
  const oldUsernames = usernames.slice(3).sort((a: string, b: string) => {
    const stringA = a.toUpperCase()
    const stringB = b.toUpperCase()
    if (stringA < stringB) return -1
    if (stringA > stringB) return 1
    return 0
  })

  return [...usernames.slice(0, 3), ...oldUsernames]
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
  invisibleTapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
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
  },
  root: {
    overflow: 'scroll'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: theme.rem(2.5),
    marginLeft: theme.rem(2)
  },
  text: {
    marginRight: 'auto',
    fontFamily: theme.fontFaceMedium
  },
  dropdownHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: theme.rem(2)
  },
  iconUser: {
    marginRight: theme.rem(1.5)
  }
}))
