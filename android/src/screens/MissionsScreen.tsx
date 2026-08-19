import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  PanResponder,
} from "react-native";
import {
  readSnapshot,
  writeSnapshot,
  readMobileProjects,
  writeMobileProjects,
  enqueueOperation,
} from "../core/storage";
import type { MobileSnapshot, Approval } from "../core/types";
import {
  createMobileProject,
  projectTargets,
  releaseTargetLabel,
  setReleaseCheck,
} from "../core/project-release";
import type { MobileProject } from "../core/project-release";
import { sharedStyles, colors } from "./styles";

interface ApprovalItemProps {
  item: Approval;
  onResolve: (id: string, decision: "approved" | "denied") => Promise<void>;
}

const ApprovalItem = React.memo(function ApprovalItem({
  item,
  onResolve,
}: ApprovalItemProps) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          item.status === "pending" &&
          Math.abs(gesture.dx) > 12 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (item.status === "pending") {
            const decision = gesture.dx > 0 ? "approved" : "denied";
            onResolve(item.id, decision);
          }
        },
      }),
    [item.id, item.status, onResolve],
  );

  return (
    <View style={sharedStyles.mission} {...panResponder.panHandlers}>
      <View style={sharedStyles.missionBody}>
        <Text style={sharedStyles.missionText}>{item.title}</Text>
        <Text style={sharedStyles.missionMeta}>
          {item.status.toUpperCase()} · {item.detail}
        </Text>
        {item.status === "pending" && (
          <Text style={sharedStyles.missionMeta}>
            Swipe right to approve · swipe left to deny
          </Text>
        )}
        {item.status === "pending" && (
          <View style={sharedStyles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Approve ${item.title}`}
              style={sharedStyles.smallAction}
              onPress={() => onResolve(item.id, "approved")}
            >
              <Text style={sharedStyles.smallActionText}>Approve</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Deny ${item.title}`}
              style={sharedStyles.smallAction}
              onPress={() => onResolve(item.id, "denied")}
            >
              <Text style={sharedStyles.smallActionText}>Deny</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
});

export default function MissionsScreen() {
  const [snapshot, setSnapshot] = useState<MobileSnapshot>({
    missions: [],
    connections: [],
    pendingApprovals: 0,
    offline: true,
  });
  const [projects, setProjects] = useState<MobileProject[]>([]);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectTarget, setProjectTarget] =
    useState<(typeof projectTargets)[number]>("android");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [savedSnapshot, savedProjects] = await Promise.all([
        readSnapshot(),
        readMobileProjects(),
      ]);
      setSnapshot(savedSnapshot);
      setProjects(savedProjects);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const createProject = useCallback(async () => {
    try {
      const project = createMobileProject(
        projectName,
        projectDescription,
        projectTarget,
      );
      const next = [project, ...projects];
      await writeMobileProjects(next);
      setProjects(next);
      setProjectName("");
      setProjectDescription("");
    } catch {}
  }, [projectDescription, projectName, projectTarget, projects]);

  const updateProjectCheck = useCallback(
    async (
      project: MobileProject,
      check: "plan" | "build" | "verify" | "package",
    ) => {
      const next = projects.map((item) =>
        item.id === project.id
          ? setReleaseCheck(item, check, !item.checks[check])
          : item,
      );
      await writeMobileProjects(next);
      setProjects(next);
    },
    [projects],
  );

  const resolveApproval = useCallback(
    async (id: string, decision: "approved" | "denied") => {
      const next: MobileSnapshot = {
        ...snapshot,
        approvals: (snapshot.approvals ?? []).map((item) =>
          item.id === id
            ? {
                ...item,
                status: decision,
                resolvedAt: new Date().toISOString(),
              }
            : item,
        ),
      };
      await writeSnapshot(next);
      if (snapshot.offline) {
        await enqueueOperation({
          idempotencyKey: `approval:${id}:${decision}`,
          method: "POST",
          path: `/v1/approvals/${encodeURIComponent(id)}/decision`,
          body: { decision },
        });
      }
      setSnapshot(next);
    },
    [snapshot],
  );

  const reviewArtifact = useCallback(
    async (id: string, decision: "accepted" | "rejected") => {
      const next: MobileSnapshot = {
        ...snapshot,
        artifacts: (snapshot.artifacts ?? []).map((item) =>
          item.id === id
            ? {
                ...item,
                review: {
                  decision,
                  note: "Reviewed on Android",
                  reviewedAt: new Date().toISOString(),
                },
              }
            : item,
        ),
      };
      await writeSnapshot(next);
      if (snapshot.offline) {
        await enqueueOperation({
          idempotencyKey: `artifact:${id}:${decision}`,
          method: "POST",
          path: `/v1/artifacts/${encodeURIComponent(id)}/review`,
          body: { decision, note: "Reviewed on Android" },
        });
      }
      setSnapshot(next);
    },
    [snapshot],
  );

  if (loading) {
    return (
      <SafeAreaView style={sharedStyles.safe}>
        <View style={sharedStyles.loading}>
          <Text style={{ color: colors.accent, marginTop: 12 }}>
            Loading missions…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={sharedStyles.safe}>
      <ScrollView
        contentContainerStyle={sharedStyles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={sharedStyles.header}>
          <View>
            <Text style={sharedStyles.eyebrow}>SPARTANCODE / MISSIONS</Text>
            <Text style={sharedStyles.title}>Mission Control</Text>
          </View>
          <Text style={sharedStyles.status}>
            {snapshot.offline ? "LOCAL" : "SYNCED"}
          </Text>
        </View>

        <Text style={sharedStyles.section}>Create a releaseable project</Text>
        <View style={sharedStyles.card}>
          <Text style={sharedStyles.message}>
            Build from this phone for any supported device or operating system.
            Desktop, server, and bridge connections are optional.
          </Text>
          <TextInput
            accessibilityLabel="Project name"
            placeholder="Project name"
            placeholderTextColor={colors.textMuted}
            style={sharedStyles.input}
            value={projectName}
            onChangeText={setProjectName}
          />
          <TextInput
            accessibilityLabel="Project description"
            placeholder="What should this product do?"
            placeholderTextColor={colors.textMuted}
            style={sharedStyles.input}
            value={projectDescription}
            onChangeText={setProjectDescription}
            multiline
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {projectTargets.map((target) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Target ${releaseTargetLabel(target)}`}
                key={target}
                style={
                  projectTarget === target
                    ? sharedStyles.primary
                    : sharedStyles.secondary
                }
                onPress={() => setProjectTarget(target)}
              >
                <Text
                  style={
                    projectTarget === target
                      ? sharedStyles.primaryText
                      : sharedStyles.secondaryText
                  }
                >
                  {releaseTargetLabel(target)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create project"
            style={sharedStyles.primary}
            onPress={createProject}
          >
            <Text style={sharedStyles.primaryText}>Create project offline</Text>
          </Pressable>
          {projects.map((project) => (
            <View key={project.id} style={sharedStyles.projectCard}>
              <View style={sharedStyles.agentRow}>
                <View style={sharedStyles.missionBody}>
                  <Text style={sharedStyles.missionText}>{project.name}</Text>
                  <Text style={sharedStyles.missionMeta}>
                    {releaseTargetLabel(project.target)} ·{" "}
                    {project.releaseStatus}
                  </Text>
                </View>
                <Text style={sharedStyles.agentMode}>
                  {project.releaseStatus === "ready" ? "RELEASE" : "PLAN"}
                </Text>
              </View>
              {(["build", "verify", "package"] as const).map((check) => (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: project.checks[check] }}
                  accessibilityLabel={`${project.name} ${check} release check`}
                  key={check}
                  style={sharedStyles.checkRow}
                  onPress={() => updateProjectCheck(project, check)}
                >
                  <Text style={sharedStyles.message}>
                    {project.checks[check] ? "✓" : "○"} {check}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        <Text style={sharedStyles.section}>Queued missions</Text>
        <View style={sharedStyles.card}>
          {snapshot.missions.length === 0 ? (
            <View style={sharedStyles.empty}>
              <Text style={sharedStyles.emptyTitle}>No missions yet</Text>
              <Text style={sharedStyles.emptyCopy}>
                Queue missions from the Chat tab when inspiration strikes.
              </Text>
            </View>
          ) : (
            snapshot.missions.map((item) => (
              <View style={sharedStyles.mission} key={item.id}>
                <View style={sharedStyles.missionDot} />
                <View style={sharedStyles.missionBody}>
                  <Text style={sharedStyles.missionText}>
                    {item.description}
                  </Text>
                  <Text style={sharedStyles.missionMeta}>
                    {item.status.replace("_", " ").toUpperCase()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={sharedStyles.sectionRow}>
          <Text style={sharedStyles.section}>Approvals</Text>
          <Text style={sharedStyles.count}>
            {
              (snapshot.approvals ?? []).filter(
                (item) => item.status === "pending",
              ).length
            }
          </Text>
        </View>
        <View style={sharedStyles.card}>
          {(snapshot.approvals ?? []).length === 0 ? (
            <View style={sharedStyles.empty}>
              <Text style={sharedStyles.emptyCopy}>
                No approval decisions waiting.
              </Text>
            </View>
          ) : (
            (snapshot.approvals ?? [])
              .slice(0, 5)
              .map((item) => (
                <ApprovalItem
                  key={item.id}
                  item={item}
                  onResolve={resolveApproval}
                />
              ))
          )}
        </View>

        <View style={sharedStyles.sectionRow}>
          <Text style={sharedStyles.section}>Artifacts</Text>
          <Text style={sharedStyles.count}>
            {(snapshot.artifacts ?? []).length}
          </Text>
        </View>
        <View style={sharedStyles.card}>
          {(snapshot.artifacts ?? []).slice(0, 5).map((item) => (
            <View style={sharedStyles.mission} key={item.id}>
              <View style={sharedStyles.missionBody}>
                <Text style={sharedStyles.missionText}>{item.name}</Text>
                <Text style={sharedStyles.missionMeta}>
                  {item.type.toUpperCase()} · {item.status.toUpperCase()}
                </Text>
              </View>
              {!item.review && (
                <View style={sharedStyles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Accept ${item.name}`}
                    style={sharedStyles.smallAction}
                    onPress={() => reviewArtifact(item.id, "accepted")}
                  >
                    <Text style={sharedStyles.smallActionText}>Accept</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Reject ${item.name}`}
                    style={sharedStyles.smallAction}
                    onPress={() => reviewArtifact(item.id, "rejected")}
                  >
                    <Text style={sharedStyles.smallActionText}>Reject</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
          {(snapshot.artifacts ?? []).length === 0 && (
            <Text style={sharedStyles.message}>
              No artifacts yet. Queue a mission to generate one.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
