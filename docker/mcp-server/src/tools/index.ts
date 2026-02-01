import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { listPersonas, ListPersonasSchema } from './personas.js';
import { listVoices, getVoiceForCourse, ListVoicesSchema, GetVoiceForCourseSchema } from './voices.js';
import { searchCourses, getCourseOutlineTool, SearchCoursesSchema, GetCourseOutlineSchema } from './courses.js';
import { getInstructorInfo, GetInstructorInfoSchema } from './instructors.js';
import { startSession, askQuestion, endSession, getSessionInfo, StartSessionSchema, AskQuestionSchema, EndSessionSchema, GetSessionInfoSchema } from './tutoring.js';
import {
  critiqueNotes, CritiqueNotesSchema,
  explainConcept, ExplainConceptSchema,
  generateDiagram, GenerateDiagramSchema,
  getFormulas, GetFormulasSchema,
  chatMessage, ChatMessageSchema,
  suggestImprovements, SuggestImprovementsSchema,
} from './notes.js';

// All available MCP tools
const TOOLS = [
  // Session-based tutoring
  StartSessionSchema,
  AskQuestionSchema,
  EndSessionSchema,
  GetSessionInfoSchema,
  
  // Course discovery
  SearchCoursesSchema,
  GetCourseOutlineSchema,
  GetInstructorInfoSchema,
  
  // Voice & personas
  ListVoicesSchema,
  GetVoiceForCourseSchema,
  ListPersonasSchema,
  
  // Notes & learning tools (NEW)
  CritiqueNotesSchema,
  ExplainConceptSchema,
  GenerateDiagramSchema,
  GetFormulasSchema,
  ChatMessageSchema,
  SuggestImprovementsSchema,
];

export function registerTools(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, () => {
    return {
      tools: TOOLS.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      let result: unknown;

      switch (name) {
        // ========== Session-based tutoring ==========
        case 'start_tutoring_session':
          result = await startSession(args as unknown as Parameters<typeof startSession>[0]);
          break;
        case 'ask_question':
          result = await askQuestion(args as unknown as Parameters<typeof askQuestion>[0]);
          break;
        case 'end_session':
          result = await endSession(args as unknown as Parameters<typeof endSession>[0]);
          break;
        case 'get_session_info':
          result = await getSessionInfo(args as unknown as Parameters<typeof getSessionInfo>[0]);
          break;
          
        // ========== Course discovery ==========
        case 'search_courses':
          result = await searchCourses(args as unknown as Parameters<typeof searchCourses>[0]);
          break;
        case 'get_course_outline':
          result = await getCourseOutlineTool(args as unknown as Parameters<typeof getCourseOutlineTool>[0]);
          break;
        case 'get_instructor_info':
          result = await getInstructorInfo(args as unknown as Parameters<typeof getInstructorInfo>[0]);
          break;
          
        // ========== Voice & personas ==========
        case 'list_voices':
          result = { voices: listVoices() };
          break;
        case 'get_voice_for_course':
          const voiceParams = args as { courseCode?: string };
          result = getVoiceForCourse(voiceParams.courseCode || '');
          break;
        case 'list_personas':
          result = { personas: listPersonas() };
          break;
          
        // ========== Notes & learning tools (NEW) ==========
        case 'critique_notes':
          result = await critiqueNotes(args as unknown as Parameters<typeof critiqueNotes>[0]);
          break;
        case 'explain_concept':
          result = await explainConcept(args as unknown as Parameters<typeof explainConcept>[0]);
          break;
        case 'generate_diagram':
          result = await generateDiagram(args as unknown as Parameters<typeof generateDiagram>[0]);
          break;
        case 'get_formulas':
          result = await getFormulas(args as unknown as Parameters<typeof getFormulas>[0]);
          break;
        case 'chat_message':
          result = await chatMessage(args as unknown as Parameters<typeof chatMessage>[0]);
          break;
        case 'suggest_improvements':
          result = await suggestImprovements(args as unknown as Parameters<typeof suggestImprovements>[0]);
          break;
          
        default:
          return {
            content: [
              {
                type: 'text',
                text: `Unknown tool: ${name}`,
              },
            ],
            isError: true,
          };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  });
}

// Export tool list for documentation
export const TOOL_LIST = TOOLS.map(t => ({ name: t.name, description: t.description }));
