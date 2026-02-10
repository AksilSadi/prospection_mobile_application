import { Feather } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import type { Dispatch, ReactElement, RefObject, SetStateAction } from "react";
import { memo } from "react";
import {
  Keyboard,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import type { Porte } from "@/types/api";

type EditPorteSheetProps = {
  editMode: "RENDEZ_VOUS_PRIS" | "CONTRAT_SIGNE" | "ARGUMENTE" | null;
  editPorte: Porte | null;
  editForm: {
    rdvDate: string;
    rdvTime: string;
    nbContrats: number;
    commentaire: string;
    nomPersonnalise: string;
  };
  setEditForm: Dispatch<
    SetStateAction<{
      rdvDate: string;
      rdvTime: string;
      nbContrats: number;
      commentaire: string;
      nomPersonnalise: string;
    }>
  >;
  argumenteCommentError: boolean;
  onCommentChange: (value: string) => void;
  savingPorte: boolean;
  hasNativePicker: boolean;
  isTablet: boolean;
  editSnapPoints: string[];
  editSheetRef: RefObject<BottomSheetModal | null>;
  renderSheetBackdrop: (props: any, opacity: number) => ReactElement;
  openDatePicker: () => void;
  openTimePicker: () => void;
  closeEditSheet: () => void;
  saveEditSheet: () => void;
  formatDateLabel: (value: string) => string;
  formatTimeLabel: (value: string) => string;
  styles: Record<string, any>;
};

function EditPorteSheet({
  editMode,
  editPorte,
  editForm,
  setEditForm,
  argumenteCommentError,
  onCommentChange,
  savingPorte,
  hasNativePicker,
  isTablet,
  editSnapPoints,
  editSheetRef,
  renderSheetBackdrop,
  openDatePicker,
  openTimePicker,
  closeEditSheet,
  saveEditSheet,
  formatDateLabel,
  formatTimeLabel,
  styles,
}: EditPorteSheetProps) {
  if (!editMode || !editPorte) return null;

  const isRdv = editMode === "RENDEZ_VOUS_PRIS";
  const isArgumente = editMode === "ARGUMENTE";

  const heroStyle = isRdv
    ? styles.sheetHeroRdv
    : isArgumente
      ? styles.sheetHeroArgument
      : styles.sheetHeroContract;

  const heroIconStyle = isRdv
    ? styles.sheetHeroIconBlue
    : isArgumente
      ? styles.sheetHeroIconAmber
      : styles.sheetHeroIconGreen;

  const heroIconName: keyof typeof Feather.glyphMap = isRdv
    ? "calendar"
    : isArgumente
      ? "message-square"
      : "award";

  const heroIconColor = isRdv ? "#1D4ED8" : isArgumente ? "#B45309" : "#047857";

  const heroTitle = isRdv ? "Rendez-vous" : isArgumente ? "Argumente" : "Contrat signe";

  const commentSectionStyle = isArgumente
    ? [styles.sheetCard, styles.sheetCardArgument, isTablet && styles.sheetCardTablet]
    : [styles.sheetCard, styles.sheetCardComment, isTablet && styles.sheetCardTablet];

  const commentIconStyle = isArgumente
    ? [styles.sheetSectionIcon, styles.sheetSectionIconAmber]
    : styles.sheetSectionIcon;

  return (
    <BottomSheetModal
      ref={editSheetRef}
      index={1}
      snapPoints={editSnapPoints}
      backdropComponent={(props) => renderSheetBackdrop(props, 0.45)}
      enablePanDownToClose
      onDismiss={closeEditSheet}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.sheetContent,
          isTablet && styles.sheetContentTablet,
        ]}
      >
        <>
            <View
              style={[
                styles.sheetHero,
                heroStyle,
                isTablet && styles.sheetHeroTablet,
              ]}
            >
              <View style={[styles.sheetHeroIcon, heroIconStyle]}>
                <Feather name={heroIconName} size={18} color={heroIconColor} />
              </View>
              <View style={styles.sheetHeroText}>
                <Text
                style={[
                  styles.sheetTitle,
                  isTablet && styles.sheetTitleTablet,
                ]}
              >
                {heroTitle}
              </Text>
              <Text
                style={[
                  styles.sheetSubtitle,
                  isTablet && styles.sheetSubtitleTablet,
                ]}
              >
                {editPorte.nomPersonnalise || `Porte ${editPorte.numero || ""}`}
              </Text>
            </View>
          </View>

          <View style={[styles.sheetCard, isTablet && styles.sheetCardTablet]}>
            <Text style={styles.sheetLabel}>Nom personnalise</Text>
            <View style={styles.inputRow}>
              <Feather name="edit-3" size={16} color="#6B7280" />
              <TextInput
                placeholder={`Porte ${editPorte?.numero || ""}`}
                value={editForm.nomPersonnalise}
                onChangeText={(value) =>
                  setEditForm((prev) => ({
                    ...prev,
                    nomPersonnalise: value,
                  }))
                }
                style={styles.inputInline}
              />
            </View>
          </View>

          {editMode === "RENDEZ_VOUS_PRIS" && (
            <View
              style={[
                styles.sheetCard,
                styles.sheetCardRdv,
                isTablet && styles.sheetCardTablet,
              ]}
            >
              <View style={styles.sheetSectionHeader}>
                <View
                  style={[styles.sheetSectionIcon, styles.sheetSectionIconBlue]}
                >
                  <Feather name="calendar" size={14} color="#1D4ED8" />
                </View>
                <View style={styles.sheetSectionText}>
                  <Text style={styles.sheetSectionTitle}>Quand</Text>
                  <Text style={styles.sheetSectionSubtitle}>
                    Date et heure du rendez-vous
                  </Text>
                </View>
              </View>
              {hasNativePicker ? (
                <>
                  <Pressable
                    style={[styles.pickerRow, styles.pickerRowPrimary]}
                    onPress={openDatePicker}
                  >
                    <View style={styles.pickerIcon}>
                      <Feather name="calendar" size={16} color="#1D4ED8" />
                    </View>
                    <View style={styles.pickerText}>
                      <Text style={styles.pickerTitle}>Date</Text>
                      <Text style={styles.pickerValue}>
                        {formatDateLabel(editForm.rdvDate)}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#94A3B8" />
                  </Pressable>
                  <Pressable
                    style={[styles.pickerRow, styles.pickerRowPrimary]}
                    onPress={openTimePicker}
                  >
                    <View style={styles.pickerIcon}>
                      <Feather name="clock" size={16} color="#1D4ED8" />
                    </View>
                    <View style={styles.pickerText}>
                      <Text style={styles.pickerTitle}>Heure</Text>
                      <Text style={styles.pickerValue}>
                        {formatTimeLabel(editForm.rdvTime)}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#94A3B8" />
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.sheetHint}>
                    Activez le DatePicker natif pour une meilleure experience.
                  </Text>
                  <View style={styles.inputRow}>
                    <Feather name="calendar" size={16} color="#6B7280" />
                    <TextInput
                      placeholder="YYYY-MM-DD"
                      value={editForm.rdvDate}
                      onChangeText={(value) =>
                        setEditForm((prev) => ({ ...prev, rdvDate: value }))
                      }
                      style={styles.inputInline}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <View style={[styles.inputRow, styles.inputRowSpacing]}>
                    <Feather name="clock" size={16} color="#6B7280" />
                    <TextInput
                      placeholder="HH:mm"
                      value={editForm.rdvTime}
                      onChangeText={(value) =>
                        setEditForm((prev) => ({ ...prev, rdvTime: value }))
                      }
                      style={styles.inputInline}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </>
              )}
            </View>
          )}

          {editMode === "CONTRAT_SIGNE" && (
            <View
              style={[
                styles.sheetCard,
                styles.sheetCardContract,
                isTablet && styles.sheetCardTablet,
              ]}
            >
              <View style={styles.sheetSectionHeader}>
                <View
                  style={[
                    styles.sheetSectionIcon,
                    styles.sheetSectionIconGreen,
                  ]}
                >
                  <Feather name="award" size={14} color="#047857" />
                </View>
                <View style={styles.sheetSectionText}>
                  <Text style={styles.sheetSectionTitle}>Contrats signes</Text>
                  <Text style={styles.sheetSectionSubtitle}>
                    Nombre total confirme
                  </Text>
                </View>
              </View>
              <View style={styles.counterRow}>
                <Pressable
                  style={styles.counterButton}
                  onPress={() =>
                    setEditForm((prev) => ({
                      ...prev,
                      nbContrats: Math.max(1, prev.nbContrats - 1),
                    }))
                  }
                >
                  <Feather name="minus" size={16} color="#111827" />
                </Pressable>
                <View style={styles.counterValueWrap}>
                  <Text style={styles.counterValue}>{editForm.nbContrats}</Text>
                  <Text style={styles.counterLabel}>contrats</Text>
                </View>
                <Pressable
                  style={[styles.counterButton, styles.counterButtonPrimary]}
                  onPress={() =>
                    setEditForm((prev) => ({
                      ...prev,
                      nbContrats: prev.nbContrats + 1,
                    }))
                  }
                >
                  <Feather name="plus" size={16} color="#111827" />
                </Pressable>
              </View>
            </View>
          )}

          <View style={commentSectionStyle}>
            <View style={styles.sheetSectionHeader}>
              <View style={commentIconStyle}>
                <Feather
                  name="message-square"
                  size={14}
                  color={isArgumente ? "#B45309" : "#2563EB"}
                />
              </View>
              <View style={styles.sheetSectionText}>
                <Text style={styles.sheetSectionTitle}>Commentaire</Text>
                <Text
                  style={[
                    styles.sheetSectionSubtitle,
                    isArgumente &&
                      argumenteCommentError &&
                      styles.sheetSectionSubtitleError,
                  ]}
                >
                  {isArgumente
                    ? argumenteCommentError
                      ? "Commentaire obligatoire"
                      : "Decris l'argument principal avant validation"
                    : "Notes rapides pour cette porte"}
                </Text>
              </View>
            </View>
            {isArgumente && argumenteCommentError ? (
              <Text style={styles.sheetRequiredText}>Ce champ est obligatoire.</Text>
            ) : null}
            <TextInput
              placeholder={
                isArgumente
                  ? "Ex: Interesse mais souhaite etre rappele le soir"
                  : "Ajouter un commentaire..."
              }
              value={editForm.commentaire}
              onChangeText={onCommentChange}
              style={[
                styles.sheetInput,
                styles.sheetTextarea,
                isArgumente && argumenteCommentError && styles.sheetInputError,
              ]}
              multiline
            />
          </View>

          <View style={[styles.sheetFooter, isTablet && styles.sheetFooterTablet]}>
            <Pressable style={styles.sheetGhost} onPress={closeEditSheet}>
              <Text style={styles.sheetGhostText}>Annuler</Text>
            </Pressable>
            <Pressable
              style={[
                styles.sheetPrimary,
                savingPorte && styles.sheetPrimaryDisabled,
                isTablet && styles.sheetPrimaryTablet,
              ]}
              onPress={() => {
                Keyboard.dismiss();
                void saveEditSheet();
              }}
              disabled={savingPorte}
            >
              <Text style={styles.sheetPrimaryText}>
                {savingPorte ? "..." : "Enregistrer"}
              </Text>
            </Pressable>
          </View>
        </>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

export default memo(EditPorteSheet);

