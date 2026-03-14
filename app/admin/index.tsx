import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import Toast from "../../components/Toast";
import RichTextEditor from "../../components/RichTextEditor";
import RenderHtml from "react-native-render-html";
import {
  getPlatformConfig,
  saveTiandiPageConfig,
} from "../../lib/platformConfigService";
import {
  AdminRecommendation,
  ensureAdminAccess,
  fetchAdminRecommendations,
  subscribeToAdminRecommendations,
  saveAdminRecommendation,
  deleteAdminRecommendation,
} from "../../lib/adminService";

function formatDate(dateString: string) {
  return dateString || "--";
}

const AdminRecommendationContent = ({ content }: { content: string | null | undefined }) => {
  const { width } = useWindowDimensions();
  
  if (!content) {
    return <Text style={styles.referenceText}>待开奖</Text>;
  }

  // Use RenderHtml to render rich text correctly
  if (content.indexOf(String.fromCharCode(60)) !== -1 && content.indexOf(String.fromCharCode(62)) !== -1) {
    return (
      <View style={{ flex: 1 }}>
        <RenderHtml
          contentWidth={width > 800 ? 500 : width - 100} 
          source={{ html: content }}
          baseStyle={{ fontSize: 13, color: "#333", margin: 0, padding: 0 }}
          tagsStyles={{
            p: { margin: 0, padding: 0 },
          }}
        />
      </View>
    );
  }

  // Fallback
  return (
    <Text style={[styles.referenceText, { flex: 1 }]} numberOfLines={0}>
      {content}
    </Text>
  );
};

export default function AdminHomeScreen() {
  const router = useRouter();

  const [items, setItems] = useState<AdminRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<
    "success" | "error" | "warning" | "info"
  >("info");
  const [pageTitle, setPageTitle] = useState("");
  const [pageDescription, setPageDescription] = useState("");
  const [savingPageConfig, setSavingPageConfig] = useState(false);

  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formId, setFormId] = useState<number | null>(null);
  const [formIssueNo, setFormIssueNo] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formSpecialAnimal, setFormSpecialAnimal] = useState("");
  const [formSpecialNum, setFormSpecialNum] = useState("");
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [formItemData, setFormItemData] = useState<AdminRecommendation | null>(null);

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AdminRecommendation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const visibleItems = items.filter(
    (item) => item.is_visible && Boolean(item.recommendation_content?.trim()),
  );

  const availableIssues = items
    .filter((item) => Boolean(item.description?.trim()))
    .map((item) => item.issue_no.replace("期", ""));

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "warning" | "info") => {
      setToastMessage(message);
      setToastType(type);
      setToastVisible(true);
    },
    [],
  );

  const loadData = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) {
        setRefreshing(true);
      }

      const accessResult = await ensureAdminAccess();
      if (accessResult.error || !accessResult.data) {
        router.replace("/admin/login");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const listResult = await fetchAdminRecommendations();
      if (listResult.error) {
        showToast(listResult.error.message, "error");
      } else {
        setItems(listResult.data || []);
      }

      const pageConfig = await getPlatformConfig();
      setPageTitle(pageConfig.tiandiPageTitle);
      setPageDescription(pageConfig.tiandiPageDescription);

      setLoading(false);
      setRefreshing(false);
    },
    [router, showToast],
  );

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeToAdminRecommendations(() => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const handleSavePageConfig = async () => {
    setSavingPageConfig(true);
    try {
      const config = await saveTiandiPageConfig(pageTitle, pageDescription);
      setPageTitle(config.tiandiPageTitle);
      setPageDescription(config.tiandiPageDescription);
      showToast("标题和描述已保存", "success");
    } catch (error: any) {
      showToast(error?.message || "保存失败", "error");
    } finally {
      setSavingPageConfig(false);
    }
  };

  const handleEditClick = (item: AdminRecommendation) => {
    setFormMode("edit");
    setFormId(item.id);
    setFormIssueNo(item.issue_no.includes("期") ? item.issue_no : `${item.issue_no}期`);
    setFormContent(item.recommendation_content || "");
    
    // Parse the 1-to-1 or multiple results safely
    let fetchedAnimal = "";
    let fetchedNum = "";
    if (item.lottery_results) {
      const lr = Array.isArray(item.lottery_results) ? item.lottery_results[0] : item.lottery_results;
      fetchedAnimal = lr?.special_animal || "";
      fetchedNum = lr?.special_num ? lr.special_num.toString() : "";
    }
    setFormSpecialAnimal(fetchedAnimal);
    setFormSpecialNum(fetchedNum);

    setFormItemData(item);
    setIsFormModalVisible(true);
  };

  const handleCreateClick = () => {
    let nextIssueNo = "";
    if (visibleItems.length > 0) {
      const latestItem = visibleItems[0];
      const match = latestItem.issue_no.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10) + 1;
        nextIssueNo = num.toString().padStart(latestItem.issue_no.replace(/\D/g, '').length || 3, "0") + "期";
      }
    }
    setFormMode("create");
    setFormId(null);
    setFormIssueNo(nextIssueNo);
    setFormContent("");
    setFormSpecialAnimal("");
    setFormSpecialNum("");
    setFormItemData(null);
    setIsFormModalVisible(true);
  };

  const closeFormModal = () => {
    setIsFormModalVisible(false);
  };

  const handleSaveForm = async () => {
    if (!formIssueNo.trim()) {
      showToast("请选择或输入期号", "warning");
      return;
    }
    
    setIsSavingForm(true);
    let error;

    if (formMode === "edit" && formItemData) {
      const result = await saveAdminRecommendation(
        {
          issue_no: formIssueNo.includes("期") ? formIssueNo : `${formIssueNo}期`,
          issue_date: formItemData.issue_date,
          title: formItemData.title || "",
          description: formItemData.description || "",
          recommendation_content: formContent,
          is_visible: formItemData.is_visible,
          special_animal: formSpecialAnimal,
          special_num: formSpecialNum,
        },
        formId ?? undefined
      );
      error = result.error;
    } else {
      const existingItem = items.find((item) => item.issue_no.replace("期", "") === formIssueNo.replace("期", ""));
      const now = new Date();
      const issueDate = existingItem ? existingItem.issue_date : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      
      const result = await saveAdminRecommendation({
        issue_no: formIssueNo.includes("期") ? formIssueNo : `${formIssueNo}期`,
        issue_date: issueDate,
        title: existingItem?.title || "",
        description: existingItem?.description || "",
        recommendation_content: formContent,
        is_visible: true,
        special_animal: formSpecialAnimal,
        special_num: formSpecialNum,
      }, existingItem?.id);
      error = result.error;
    }

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast(formMode === "create" ? "创建成功" : "更新成功", "success");
      setIsFormModalVisible(false);
      loadData();
    }
    setIsSavingForm(false);
  };

  const handleDeleteClick = (item: AdminRecommendation) => {
    setItemToDelete(item);
    setIsDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const { error } = await deleteAdminRecommendation(itemToDelete.id);
    setIsDeleting(false);
    setIsDeleteModalVisible(false);
    setItemToDelete(null);

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("删除成功", "success");
      loadData();
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalVisible(false);
    setItemToDelete(null);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>正加载后台数据...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.pageContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
          />
        }
      >
        <View style={styles.configCard}>
          <View style={styles.configHeaderRow}>
            <View style={styles.configHeader}>
              <Text style={styles.configTitle}>全局页面文案</Text>
            </View>
            <TouchableOpacity
              style={styles.configSaveButton}
              onPress={handleSavePageConfig}
              disabled={savingPageConfig}
            >
              {savingPageConfig ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.configSaveButtonText}>保存</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.configFormGroup}>
            <Text style={styles.configLabel}>标题</Text>
            <TextInput
              style={styles.configInput}
              value={pageTitle}
              onChangeText={setPageTitle}
              placeholder="请输入全局标题"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.configFormGroup}>
            <Text style={styles.configLabel}>描述</Text>
            <RichTextEditor
              value={pageDescription}
              onChange={setPageDescription}
              placeholder="支持多行，可编辑颜色，前台将逐行展示"
            />
          </View>
        </View>

        <View style={styles.listCard}>
          <View style={styles.tableSectionHeader}>
            <View style={styles.tableSectionTextContainer}>
              <Text style={styles.tableSectionTitle}>期次列表</Text>
            </View>
            <View style={styles.tableHeaderActions}>
              <TouchableOpacity
                style={styles.tableAddButton}
                onPress={handleCreateClick}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.tableAddButtonText}>新增一期</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tableCard}>
            <View style={styles.tableHeaderRow}>
              <Text
                style={[
                  styles.tableHeaderText,
                  styles.colIssue,
                  { textAlign: "center" },
                ]}
              >
                期数
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  styles.colContentLeft, { textAlign: "left", paddingLeft: 0 },
                ]}
              >
                推荐参考
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  styles.colResult, { textAlign: "center" },
                ]}
              >
                开奖结果
              </Text>
<Text style={[styles.tableHeaderText, styles.colAction, { textAlign: "center" }]}>
                操作
              </Text>
            </View>

            {visibleItems.map((item, index) => {
              const rowBackgroundColor = index % 2 === 0 ? "#fafafa" : "#fff";

              return (
                <View
                  key={item.id}
                  style={[
                    styles.tableRow,
                    { backgroundColor: rowBackgroundColor },
                  ]}
                >
                  <View style={styles.colIssue}>
                    <Text style={styles.issueNumberText}>
                      {item.issue_no.includes("期")
                        ? item.issue_no
                        : item.issue_no + "期"}
                    </Text>
                  </View>
                  <View style={styles.colContentLeft}>
                    <AdminRecommendationContent content={item.recommendation_content} />
                  </View>
                  <View style={styles.colResult}>
                    {(() => {
                      const lr = Array.isArray(item.lottery_results) ? item.lottery_results[0] : item.lottery_results;
                      if (!lr?.special_animal && !lr?.special_num) {
                        return <Text style={styles.resultText}>待开奖</Text>;
                      }
                      return (
                        <Text style={styles.resultText}>
                          {lr.special_animal ? `${lr.special_animal} ` : ""}
                          {lr.special_num ? lr.special_num : ""}
                        </Text>
                      );
                    })()}
                  </View>
                  <View
                    style={[
                      styles.colAction,
                      { flexDirection: "row", justifyContent: "center", gap: 6 },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.btnEdit}
                      onPress={() => handleEditClick(item)}
                    >
                      <Ionicons name="create-outline" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnDelete}
                      onPress={() => handleDeleteClick(item)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {visibleItems.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>暂无展示内容</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />

      
      <Modal visible={isFormModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: "90%", maxWidth: 700 }]}>
            <Text style={styles.modalTitle}>{formMode === "create" ? "新增一期推荐" : "编辑推荐"}</Text>
            
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.configLabel}>期数</Text>
              <View style={[styles.pickerWrapper, { marginTop: 8, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8 }]}>
                <Picker
                  selectedValue={formIssueNo}
                  onValueChange={(val) => setFormIssueNo(val ? val.toString() : "")}
                  style={styles.pickerStyle}
                >
                  <Picker.Item label="请选择期数" value="" />
                  {availableIssues.map((issue) => (
                    <Picker.Item key={issue} label={issue.includes("期") ? issue : issue + "期"} value={issue.includes("期") ? issue : issue + "期"} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={{ marginBottom: 24, zIndex: 99 }}>
              <Text style={styles.configLabel}>推荐参考数据</Text>
              <View style={{ marginTop: 8 }}>
                <RichTextEditor
                  value={formContent}
                  onChange={setFormContent}
                  placeholder="请输入推荐参考内容（可编辑颜色、底色和排版）"
                  minHeight={150}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.configLabel}>开奖生肖 (特码)</Text>
                <TextInput
                  style={[styles.configInput, { marginTop: 8 }]}
                  value={formSpecialAnimal}
                  onChangeText={setFormSpecialAnimal}
                  placeholder="如：牛"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.configLabel}>开奖数字 (特码)</Text>
                <TextInput
                  style={[styles.configInput, { marginTop: 8 }]}
                  value={formSpecialNum}
                  onChangeText={setFormSpecialNum}
                  placeholder="如：11"
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={closeFormModal}
                disabled={isSavingForm}
              >
                <Text style={styles.modalCancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSaveForm}
                disabled={isSavingForm}
              >
                {isSavingForm ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>确定保存</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={isDeleteModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>确认删除</Text>
            <Text style={styles.modalMessage}>确定要删除这一期内容吗？{"\n"}删除后前台将不再展示。</Text>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={cancelDelete}
                disabled={isDeleting}
              >
                <Text style={styles.modalCancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>确定</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f2f5f9" },
  pageContent: { padding: 16, gap: 16 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: "#666" },

  configCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  configHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  configHeader: { gap: 4, flex: 1 },
  configTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937" },
  configSubtitle: { fontSize: 13, color: "#6b7280" },
  configFormGroup: { gap: 6 },
  configLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
  configInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#f9fafb",
  },
  configTextarea: { minHeight: 80 },
  configSaveButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  configSaveButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  listCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 12 },

  tableSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: 12,
  },
  tableSectionTextContainer: { flex: 1 },
  tableSectionTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937" },
  tableSectionSubtitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  tableHeaderActions: { flexDirection: "row", gap: 8, alignItems: "center" },

  tableAddButton: {
    backgroundColor: "#3b82f6",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  tableAddButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  tableCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#f3f4f6", paddingVertical: 12, paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableHeaderText: { fontSize: 14, fontWeight: "700", color: "#374151" },
  tableRow: { flexDirection: "row", paddingVertical: 14, paddingHorizontal: 8,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },

  colIssue: { flex: 1, alignItems: "center", justifyContent: "center" },
  colContentLeft: {
    flex: 2.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 8,
  },
  colResult: {
    flex: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 0,
  },
  colAction: {
    flex: 1.1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  issueNumberText: { fontSize: 14, color: "#1f2937", textAlign: "center" },
  resultText: {
    fontSize: 14,
    color: "#4b5563",
    fontWeight: "600",
    textAlign: "center",
  },
  referenceText: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "500",
    textAlign: "center",
  },

  btnEdit: {
    backgroundColor: "#f59e0b",
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  btnDelete: {
    backgroundColor: "#ef4444",
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  btnSave: {
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  btnCancel: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  btnTextLight: { color: "#fff", fontSize: 13, fontWeight: "600" },
  btnTextDark: { color: "#374151", fontSize: 13, fontWeight: "600" },

  editInputLine: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 14,
    color: "#1f2937",
    backgroundColor: "#fff",
  },

  emptyState: { padding: 32, alignItems: "center" },
  emptyTitle: { fontSize: 14, color: "#9ca3af" },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    backgroundColor: "#fff",
    height: 34,
    justifyContent: "center",
    overflow: "hidden",
    minWidth: 80,
  },
  pickerStyle: {
    height: 34,
    width: "100%",
    borderWidth: 0,
    backgroundColor: "transparent",
    fontSize: 14,
    color: "#1f2937",
    outlineStyle: "none",
  } as any,

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 320,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 15,
    color: "#4b5563",
    textAlign: "center",
    lineHeight: 22,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    alignItems: "center",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 16,
    color: "#4b5563",
    fontWeight: "600",
  },
  modalConfirmBtnText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
});













