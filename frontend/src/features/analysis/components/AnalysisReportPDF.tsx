import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { type AnalysisResult } from '../services/analysis.service';

// Register fonts (optional - uses built-in fonts if not specified)
Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
});

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: '#2563EB',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  infoColumn: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 12,
    color: '#1F2937',
    marginBottom: 8,
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#15803D',
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  listContainer: {
    marginBottom: 15,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 8,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
    marginRight: 8,
    marginTop: 6,
  },
  improvementBullet: {
    backgroundColor: '#F59E0B',
  },
  listText: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 1.4,
    flex: 1,
  },
  categoryContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 6,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  categoryScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  feedbackText: {
    fontSize: 10,
    color: '#4B5563',
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9CA3AF',
    borderTop: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 8,
    bottom: 10,
    right: 40,
    color: '#9CA3AF',
  },
});

interface AnalysisReportPDFProps {
  analysis: AnalysisResult;
  // When true, hide numeric scores/percentages from the report
  hideScores?: boolean;
}

export function AnalysisReportPDF({ analysis, hideScores = false }: AnalysisReportPDFProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Satisfactory';
    if (score >= 60) return 'Needs Improvement';
    return 'Requires Attention';
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Teaching Analysis Report</Text>
          <Text style={styles.subtitle}>
            Generated on {formatDate(new Date().toISOString())}
          </Text>
        </View>

        {/* Teacher and Class Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Class Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoColumn}>
              <Text style={styles.infoLabel}>Teacher</Text>
              <Text style={styles.infoValue}>
                {analysis.teacher_first_name} {analysis.teacher_last_name}
              </Text>

              <Text style={styles.infoLabel}>Class</Text>
              <Text style={styles.infoValue}>
                {analysis.class_name}
              </Text>

              <Text style={styles.infoLabel}>Subject & Grade</Text>
              <Text style={styles.infoValue}>
                {analysis.subject} - Grade {analysis.grade}
              </Text>
            </View>
            <View style={styles.infoColumn}>
              <Text style={styles.infoLabel}>Analysis Template</Text>
              <Text style={styles.infoValue}>
                {analysis.template_name || 'Unknown Template'}
              </Text>

              <Text style={styles.infoLabel}>Analysis Date</Text>
              <Text style={styles.infoValue}>
                {formatDate(analysis.created_at)}
              </Text>

              {analysis.applied_by_first_name && (
                <>
                  <Text style={styles.infoLabel}>Applied By</Text>
                  <Text style={styles.infoValue}>
                    {analysis.applied_by_first_name} {analysis.applied_by_last_name}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Overall Score (hidden when hideScores) */}
        {!hideScores && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overall Performance</Text>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreText}>{Math.round(analysis.overall_score)}%</Text>
              <Text style={styles.scoreLabel}>
                {getScoreLabel(analysis.overall_score)} Performance
              </Text>
            </View>
          </View>
        )}

        {/* Strengths */}
        {analysis.strengths && analysis.strengths.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Strengths</Text>
            <View style={styles.listContainer}>
              {analysis.strengths.map((strength, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.bullet} />
                  <Text style={styles.listText}>{strength}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Areas for Improvement */}
        {analysis.improvements && analysis.improvements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Areas for Improvement</Text>
            <View style={styles.listContainer}>
              {analysis.improvements.map((improvement, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={[styles.bullet, styles.improvementBullet]} />
                  <Text style={styles.listText}>{improvement}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Page break - content will flow to next page automatically */}

        {/* Detailed Feedback */}
        {analysis.detailed_feedback && Object.keys(analysis.detailed_feedback).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detailed Analysis by Category</Text>
            {Object.entries(analysis.detailed_feedback).map(([category, feedback], index) => (
              <View key={category} style={styles.categoryContainer}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{category}</Text>
                  {!hideScores && (
                    <Text style={styles.categoryScore}>{Math.round(feedback.score)}%</Text>
                  )}
                </View>
                <Text style={styles.feedbackText}>{feedback.feedback}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Analysis Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analysis Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoColumn}>
              <Text style={styles.infoLabel}>AI Model</Text>
              <Text style={styles.infoValue}>
                {analysis.ai_model || 'Unknown Model'}
              </Text>

              <Text style={styles.infoLabel}>Analysis Summary</Text>
              <Text style={styles.infoValue}>
                {analysis.strengths?.length || 0} Strengths, {analysis.improvements?.length || 0} Improvements
              </Text>
            </View>
            <View style={styles.infoColumn}>
              {analysis.template_description && (
                <>
                  <Text style={styles.infoLabel}>Template Description</Text>
                  <Text style={styles.infoValue}>
                    {analysis.template_description.length > 100 
                      ? `${analysis.template_description.substring(0, 100)}...` 
                      : analysis.template_description
                    }
                  </Text>
                </>
              )}

              <Text style={styles.infoLabel}>Evaluation Criteria</Text>
              <Text style={styles.infoValue}>
                {analysis.detailed_feedback ? Object.keys(analysis.detailed_feedback).length : 0} criteria evaluated
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          ClassReflect - Teaching Analysis Report | Generated by AI Analysis System
        </Text>

        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `${pageNumber} / ${totalPages}`
        )} fixed />
      </Page>
    </Document>
  );
}
