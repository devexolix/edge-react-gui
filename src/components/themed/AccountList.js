// @flow

import { type EdgeUserInfo } from 'edge-core-js'
import * as React from 'react'
import { Pressable, ScrollView, TouchableHighlight, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated'
import Feather from 'react-native-vector-icons/Feather'
import MaterialIcon from 'react-native-vector-icons/MaterialIcons'
import { sprintf } from 'sprintf-js'

import { deleteLocalAccount } from '../../actions/AccountActions.js'
import { logoutRequest } from '../../actions/LoginActions.js'
import { Fontello } from '../../assets/vector'
import s from '../../locales/strings'
import { useEffect, useMemo, useState } from '../../types/reactHooks'
import { useDispatch, useSelector } from '../../types/reactRedux'
import { ButtonsModal } from '../modals/ButtonsModal.js'
import { Airship } from '../services/AirshipInstance.js'
import { type Theme, cacheStyles, useTheme } from '../services/ThemeContext'
import { DividerLine } from '../themed/DividerLine'
import { EdgeText } from '../themed/EdgeText'

type Props = {
  onToggle: (isOpen: boolean) => void,
  duration?: number
}

export function AccountList(props: Props) {
  const { onToggle, duration = 500 } = props
  const activeUsername = useSelector(state => state.core.account.username)
  const context = useSelector(state => state.core.context)
  const dispatch = useDispatch()
  const theme = useTheme()
  const styles = getStyles(theme)

  const memoUserlist = useMemo(() => arrangeUsers(context.localUsers, activeUsername), [activeUsername, context])

  // Maintain the list of usernames:
  const [usernames, setUsernames] = useState(memoUserlist)
  useEffect(() => context.watch('localUsers', localUsers => setUsernames(memoUserlist)), [memoUserlist, context])

  const handleDelete = (username: string) => {
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
              height.value -= styles.row.height
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

  const listHeight = styles.row.height * usernames.length + theme.rem(1)
  const isOpen = useSharedValue(false)
  const height = useDerivedValue(() => (isOpen.value ? listHeight : 0), isOpen)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: withTiming(height.value, {
        duration: duration,
        easing: Easing.inOut(Easing.exp)
      })
    }
  })

  const handleOpen = () => {
    isOpen.value = !isOpen.value
    onToggle(isOpen.value)
  }

  return (
    <View>
      <Pressable onPress={handleOpen}>
        <View style={styles.header}>
          <Fontello name="account" style={styles.iconUser} size={theme.rem(1.5)} color={theme.controlPanelIcon} />
          <EdgeText style={styles.text}>{activeUsername}</EdgeText>
          {isOpen ? (
            <Feather name="chevron-up" color={theme.controlPanelIcon} size={theme.rem(1.5)} />
          ) : (
            <Feather name="chevron-down" color={theme.controlPanelIcon} size={theme.rem(1.5)} />
          )}
        </View>
      </Pressable>
      <DividerLine marginRem={[1, -2, 0, 0]} />
      <Animated.View style={[styles.root, animatedStyle]}>
        <ScrollView>
          {usernames.map((username: string) => (
            <View key={username} style={styles.row}>
              <TouchableHighlight onPress={() => handleSwitchAccount(username)}>
                <EdgeText style={styles.text}>{username}</EdgeText>
              </TouchableHighlight>
              <TouchableHighlight onPress={() => handleDelete(username)}>
                <View>
                  <MaterialIcon size={theme.rem(1.5)} name="close" color={theme.controlPanelIcon} />
                </View>
              </TouchableHighlight>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
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
    fontFamily: theme.fontFaceBold
  },
  header: {
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
